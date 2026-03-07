# Tenant-Aware Login Flow — Analysis & Gap Report
## Vital Health Hub Platform

**Version:** 1.0  
**Date:** 2026-03-06  
**Status:** Analysis Complete — Implementation Pending

---

## 1. Executive Summary

The current hospital login flow (`/nh/api/v1/auth/login`) **does NOT support multi-tenancy**. All user lookups happen against the default MongoDB connection, meaning only users in the platform's main database can log in. Users created during organization onboarding (stored in tenant-specific databases like `nh_tenant_city_hospital`) **cannot log in** through the standard flow.

**Severity: CRITICAL** — This is a blocking issue for multi-tenant operation.

---

## 2. Current Flow Analysis

### 2.1 What Happens Today

```
1. User submits email + password to POST /nh/api/v1/auth/login
2. NH_authController.login() runs:
   → User.findOne({ email }) 
   → This uses the DEFAULT mongoose connection (main DB)
3. If user exists in main DB → login succeeds
4. If user was created in nh_tenant_xyz → login FAILS (user not found)
```

### 2.2 Affected Code Paths

| File | Issue |
|------|-------|
| `backend/src/controllers/NH_authController.js:78` | `User.findOne()` uses default connection |
| `backend/src/config/passport.js:17` | Local strategy uses default `User` model |
| `backend/src/config/passport.js:52` | JWT strategy uses default `User.findById()` |
| `backend/src/middleware/auth.js:5` | `passport.authenticate('jwt')` resolves user from default DB |

### 2.3 Root Cause

When the Grandmaster onboards an organization, it creates the admin user in the **tenant database**:

```javascript
// GM_organizationController.js, line 126-143
const tenantConn = getTenantConnection({ dbName, dbUri });
const TenantUser = tenantConn.model('User', UserSchema);
await TenantUser.create({
  email: adminDetails.email,
  password: hashedPassword,
  firstName: adminDetails.firstName,
  // ... stored in nh_tenant_<slug> database
});
```

But the login controller searches the **main database**:

```javascript
// NH_authController.js, line 78
const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
// User model is bound to default mongoose connection → main DB
```

---

## 3. Proposed Solution: Email-to-Tenant Resolution

### 3.1 Approach Options

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A. Mapping Table** | New `GM_UserOrgMapping` collection in platform DB mapping email → orgId | Fast O(1) lookup, explicit | Requires sync when users are added/removed in tenants |
| **B. Admin Email Lookup** | Search `GM_Organization.adminDetails.email` | No new table, works for admins | Only works for the onboarding admin, not other staff |
| **C. Broadcast Search** | Try each tenant DB sequentially until user found | No mapping needed | O(N) per login — unacceptable at scale |
| **D. Login with Org Code** | User provides org slug/code alongside email | Deterministic routing, no lookup | Worse UX — users must remember org code |
| **E. Hybrid (Recommended)** | Mapping table (A) + org code fallback (D) | Best of both worlds | Slightly more complex |

### 3.2 Recommended: Option E — Hybrid Approach

#### Phase 1: User-Organization Mapping Table

```javascript
// New model: GM_UserOrgMapping
{
  email: String,          // indexed, unique
  organizationId: ObjectId,  // ref → GM_Organization
  dbName: String,         // cached for fast access
  dbUri: String,          // optional custom URI
  role: String,           // cached role for quick checks
  createdAt: Date
}
```

#### Phase 2: Login Flow Changes

```
POST /nh/api/v1/auth/login { email, password, orgSlug? }

1. IF orgSlug provided:
   → GM_Organization.findOne({ slug: orgSlug })
   → Get dbName/dbUri → connect to tenant
   
2. ELSE (email-only login):
   → GM_UserOrgMapping.findOne({ email })
   → Get dbName/dbUri → connect to tenant
   
3. IF no mapping found:
   → Fallback to default DB (backward compatibility)
   
4. Get tenant connection via getTenantConnection()
5. Register User model on tenant connection
6. TenantUser.findOne({ email }).select('+password')
7. Validate password, check isActive
8. Check org.status === 'active'
9. Check subscription validity
10. Generate JWT with tenant context:
    { id, role, orgId, dbName, enabledModules }
11. Return enhanced response with org context
```

#### Phase 3: JWT Strategy Changes

```javascript
// passport.js JWT strategy must also be tenant-aware
passport.use(new JwtStrategy(opts, async (payload, done) => {
  // If token has orgId/dbName → use tenant connection
  if (payload.dbName) {
    const conn = getTenantConnection({ dbName: payload.dbName });
    const TenantUser = conn.model('User', UserSchema);
    const user = await TenantUser.findById(payload.id);
    user._tenantDbName = payload.dbName; // attach context
    return done(null, user);
  }
  // Fallback to default connection
  const user = await User.findById(payload.id);
  return done(null, user);
}));
```

#### Phase 4: All NH Controllers Become Tenant-Aware

Every controller currently using `const { User, Patient, ... } = require('../models')` must instead resolve models from the tenant connection. A middleware approach:

```javascript
// Middleware: attachTenantModels
const attachTenantModels = (req, res, next) => {
  if (req.user._tenantDbName) {
    const conn = getTenantConnection({ dbName: req.user._tenantDbName });
    req.tenantModels = {
      User: conn.model('User', UserSchema),
      Patient: conn.model('Patient', PatientSchema),
      Bed: conn.model('Bed', BedSchema),
      // ... all NH_ models
    };
  } else {
    req.tenantModels = defaultModels;
  }
  next();
};
```

### 3.3 Mapping Sync Strategy

The mapping table must stay in sync with tenant user tables:

| Event | Action |
|-------|--------|
| Org onboarding | Create mapping for admin email |
| User created in tenant | API hook creates mapping entry |
| User deleted in tenant | API hook removes mapping entry |
| User email changed | Update mapping entry |

---

## 4. Impact Analysis

### 4.1 Files Requiring Changes

| File | Change Type | Complexity |
|------|------------|------------|
| `backend/src/models/GM_UserOrgMapping.js` | **NEW** | Low |
| `backend/src/controllers/NH_authController.js` | **MAJOR** | High |
| `backend/src/config/passport.js` | **MAJOR** | High |
| `backend/src/middleware/auth.js` | **MODERATE** | Medium |
| `backend/src/middleware/tenantResolver.js` | **NEW** | Medium |
| `backend/src/config/tenantManager.js` | **MINOR** (add more model registrations) | Low |
| `backend/src/controllers/GM_organizationController.js` | **MINOR** (sync mapping on onboard) | Low |
| `backend/src/controllers/NH_userController.js` | **MINOR** (sync mapping on CRUD) | Low |
| All `backend/src/controllers/NH_*.js` | **MODERATE** (use `req.tenantModels`) | High (volume) |
| `src/lib/AuthContext.jsx` | **MINOR** (store org context) | Low |
| `src/lib/api-client.js` | **MINOR** (send org header) | Low |
| `src/components/layout/AppSidebar.jsx` | **MINOR** (filter by enabledModules) | Low |
| `src/pages/Login.jsx` | **MINOR** (optional org code field) | Low |

### 4.2 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing single-tenant installs | High | Fallback to default DB when no mapping found |
| Email collision across tenants | Medium | Unique constraint on mapping table (one email → one org) |
| Mapping table out of sync | Medium | Sync hooks on all user CRUD + periodic reconciliation job |
| Performance of mapping lookup | Low | Index on email field, cached connection pool |
| JWT token size increase | Low | Only add orgId + dbName (minimal bytes) |

### 4.3 Migration Plan

1. Create `GM_UserOrgMapping` collection
2. Backfill mappings from existing organizations' `adminDetails.email`
3. Deploy updated auth controller with fallback
4. Update all NH controllers to use `req.tenantModels`
5. Update JWT strategy
6. Test with multiple tenants

---

## 5. Frontend Changes Required

### 5.1 Login Page
- Optional "Organization Code" field for disambiguation
- Show organization name after email is entered (if mapping found)

### 5.2 Auth Context
- Store `organization` object alongside `user` and `token`
- Provide `organization.enabledModules` to sidebar for filtering

### 5.3 Sidebar
- Filter navigation items based on `organization.enabledModules`
- Currently hardcoded to RBAC only — needs to intersect with org modules

### 5.4 API Client
- Optionally send `X-Tenant-DB` header for explicit tenant routing
- Or rely entirely on JWT-embedded tenant info (simpler)

---

## 6. Conclusion

The tenant-aware login is the **most critical missing piece** for the multi-tenant architecture to function. Without it, the Grandmaster module can onboard organizations and create their databases, but those organizations' users cannot actually log in and use the system.

**Estimated effort:** 3-5 days for a senior developer  
**Priority:** P0 — Blocking  
**Dependencies:** None (all infrastructure exists)
