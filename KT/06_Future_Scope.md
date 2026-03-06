# Future Scope & Roadmap
## Vital Health Hub Platform

**Version:** 2.0  
**Date:** 2026-03-06

---

## 1. Critical / P0 — Blocking Items

### 1.1 Tenant-Aware Login Flow
**Status:** Not Implemented  
**Impact:** Multi-tenancy is non-functional without this

- Implement `GM_UserOrgMapping` collection
- Update `NH_authController.login()` to resolve tenant from email
- Update Passport JWT strategy to be tenant-aware
- Add `attachTenantModels` middleware to all NH routes
- Refactor all NH controllers to use `req.tenantModels` instead of direct model imports
- See `04_Tenant_Aware_Login_Analysis.md` for full design

### 1.2 Subscription Enforcement
**Status:** Schema exists, enforcement missing

- Middleware to check subscription validity on every authenticated request
- Block access to modules not included in the subscription plan
- Grace period handling with user-facing warnings
- Auto-expire subscriptions via cron job

### 1.3 Module Filtering on Frontend
**Status:** Not Implemented

- Sidebar must filter navigation based on `organization.enabledModules`
- Intersection of RBAC permissions AND org-enabled modules
- Hide routes for disabled modules

---

## 2. High Priority / P1

### 2.1 Audit Logging
- Track all Grandmaster actions (onboarding, suspensions, module changes)
- Track tenant-level admin actions (user creation, role changes)
- Immutable audit trail with timestamps, actor, and action details

### 2.2 Subscription Expiry Notifications
- Automated email alerts at 7, 3, and 1 day(s) before expiry
- In-app banner for hospital admins when subscription is expiring
- Grandmaster dashboard widget for upcoming renewals

### 2.3 Tenant Model Registration
- Currently only `User` and `Patient` models are registered on tenant connections
- All 20+ NH_ models need to be registered in `registerTenantModels()`
- Create a centralized model registry

### 2.4 Walk-in to Internal Patient Conversion
- One-click conversion of external/walk-in patient to registered patient
- Link all existing external lab tests, radiology orders, and prescriptions
- Merge billing records

### 2.5 Payment Gateway Integration
- Integrate Razorpay / Stripe for subscription payments
- Auto-record payments on successful transactions
- Invoice generation for subscription payments
- Webhook-based status updates

---

## 3. Medium Priority / P2

### 3.1 Grandmaster Analytics Dashboard
- Organization growth trends over time (line chart)
- Revenue trends (monthly, quarterly, yearly)
- Module adoption rates across organizations
- Subscription churn analysis
- Geographic distribution map

### 3.2 Multi-Organization Login (SSO-like)
- Users who work across multiple organizations (e.g., visiting doctors)
- Organization selector after login
- Switch between organizations without re-authentication

### 3.3 White-Label / Branding
- Per-organization logo, color scheme, and branding
- Custom login page per organization
- Organization-specific email templates

### 3.4 Inventory Management Module
- Medicine and consumable stock tracking
- Purchase order management
- Supplier management
- Low stock alerts
- Integration with pharmacy module

### 3.5 IPD (In-Patient Department) Module
- Detailed in-patient workflow
- Nursing care plans
- Medication administration records (MAR)
- Diet management
- Discharge planning

### 3.6 OPD Enhancements
- Token/queue management system
- Wait time estimation
- Online appointment booking for patients
- Telemedicine integration

---

## 4. Low Priority / P3

### 4.1 Mobile Application
- React Native app for doctors and nurses
- Push notifications
- Quick vital entry
- Patient rounding checklists

### 4.2 Patient Portal
- Patient-facing web app
- View own medical records
- Book appointments online
- View lab results and prescriptions
- Payment history

### 4.3 Insurance & TPA Integration
- Insurance company master data
- Cashless authorization workflow
- Claim submission and tracking
- TPA document management

### 4.4 Advanced Reporting
- Custom report builder (drag-and-drop)
- Scheduled report generation and email delivery
- Cross-tenant aggregated reports for Grandmaster
- Compliance reports (NABH, HIPAA if applicable)

### 4.5 Data Export & Interoperability
- HL7 FHIR compliance for data exchange
- DICOM integration for radiology images
- CSV/Excel export for all data tables
- API for third-party integrations

### 4.6 AI-Powered Features
- Predictive bed occupancy
- Drug interaction warnings
- Automated clinical decision support
- Natural language search across patient records
- Anomaly detection in vital signs

### 4.7 Backup & Disaster Recovery
- Automated per-tenant database backups
- Point-in-time recovery
- Cross-region replication
- Backup monitoring and alerts in Grandmaster

### 4.8 Rate Limiting & Security Hardening
- API rate limiting per tenant
- Brute-force login protection
- Two-factor authentication (2FA)
- Session management with refresh tokens
- IP whitelisting for Grandmaster portal

---

## 5. Technical Debt

| Item | Current State | Target State |
|------|--------------|--------------|
| Controller size | Some controllers >300 lines | Split into service + controller layers |
| Model registration | Only User + Patient in tenant manager | All NH_ models registered |
| Error handling | Basic AppError | Structured error codes for frontend |
| Testing | Minimal test coverage | Unit + integration tests for critical paths |
| API documentation | None | Swagger/OpenAPI specification |
| Environment config | Scattered env vars | Centralized config with validation |
| Database migrations | None (schema evolution via mongoose) | Migration scripts for schema changes |
| Logging | Console.log | Structured logging (Winston/Pino) |
| Monitoring | Basic tenant count | APM integration (Datadog/NewRelic) |
| CI/CD | None | GitHub Actions pipeline |

---

## 6. Scalability Considerations

### Current Limits
- Connection pool: 5 connections per tenant
- Connection cache: In-memory Map (lost on restart)
- No connection idle timeout / cleanup

### Recommended Improvements
1. **Connection pooling limits:** Cap total tenant connections (e.g., 100) with LRU eviction
2. **Redis-backed session:** Move JWT blacklist and tenant mapping cache to Redis
3. **Horizontal scaling:** Sticky sessions for Socket.io, shared Redis for pub/sub
4. **Database sharding:** Shard large tenant databases by collection
5. **CDN:** Serve frontend from CDN edge locations
6. **Containerization:** Docker + Kubernetes for auto-scaling API pods
7. **Read replicas:** MongoDB read replicas for reporting queries
