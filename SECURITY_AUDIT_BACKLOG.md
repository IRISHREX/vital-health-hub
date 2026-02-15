# Security Audit Backlog

Status: Pending remediation  
Scope: Backend auth/authorization, token handling, API hardening, frontend session storage

## 1) Critical - Public registration can create privileged accounts
- Severity: Critical
- Files:
  - `backend/src/routes/auth.js:8`
  - `backend/src/controllers/NH_authController.js:30`
- Issue:
  - `/register` is publicly exposed and role restrictions are only enforced when `req.user` exists.
  - Unauthenticated callers can submit `role: super_admin` / `hospital_admin`.
- Risk:
  - Full system compromise via self-provisioned admin account.
- Fix plan:
  1. Make `/register` authenticated and admin-only (or remove public route entirely).
  2. Enforce server-side role allowlist independent of `req.user`.
  3. Add tests for forbidden role creation by non-super-admins.

## 2) High - CORS allows all origins
- Severity: High
- File:
  - `backend/src/server.js:23`
- Issue:
  - CORS callback allows unknown origins (`callback(null, true)` in both branches).
  - `credentials: true` is enabled.
- Risk:
  - Cross-origin API access from untrusted domains.
- Fix plan:
  1. Reject non-whitelisted origins in production.
  2. Keep a strict `FRONTEND_URL` allowlist.
  3. Add integration test for blocked origins.

## 3) High - JWT secret fallback is unsafe
- Severity: High
- File:
  - `backend/src/config/index.js:12`
- Issue:
  - Uses static fallback secret (`fallback_secret_for_dev_only`) when env is missing.
- Risk:
  - Token forgery if deployed with missing secret.
- Fix plan:
  1. Fail startup when `JWT_SECRET` is missing in non-dev env.
  2. Prefer no default even in dev, or generate ephemeral dev-only secret explicitly.

## 4) Medium - Password reset token generation/storage is weak
- Severity: Medium
- Files:
  - `backend/src/models/NH_User.js:96`
  - `backend/src/controllers/NH_authController.js:250`
- Issue:
  - Reset token uses `Math.random()` and is stored in plaintext.
- Risk:
  - Predictable/stealable reset token attack path if DB/logs leak.
- Fix plan:
  1. Generate token with `crypto.randomBytes`.
  2. Store only token hash in DB.
  3. Compare incoming token after hashing.

## 5) Medium - JWT in localStorage (XSS impact amplification)
- Severity: Medium
- Files:
  - `src/lib/api-client.js:20`
  - `src/lib/AuthContext.jsx:13`
- Issue:
  - Access token persisted in `localStorage`.
- Risk:
  - Any XSS can exfiltrate bearer tokens and hijack sessions.
- Fix plan:
  1. Move to secure, httpOnly, sameSite cookies if feasible.
  2. Add CSP and strict input/output sanitization defenses.

## 6) Medium - Missing baseline API hardening
- Severity: Medium
- File:
  - `backend/src/server.js`
- Issue:
  - No `helmet` or login/API rate limiting observed.
- Risk:
  - Higher brute-force and common web attack exposure.
- Fix plan:
  1. Add `helmet` defaults and tune CSP.
  2. Add `express-rate-limit` to auth-sensitive routes.
  3. Add request size limits for abuse resistance.

## 7) Medium - Potential sensitive user metadata exposure in admin responses
- Severity: Medium
- Files:
  - `backend/src/controllers/NH_userController.js:25`
  - `backend/src/models/NH_User.js:67`
- Issue:
  - Admin user listing may include fields such as `passwordResetToken` if present.
- Risk:
  - Sensitive token leakage to admin API consumers and logs.
- Fix plan:
  1. Mark reset token fields as `select: false`.
  2. Explicitly project safe fields in user list endpoints.

---

## Suggested Remediation Order
1. Lock down `/register`.
2. Fix CORS allowlist enforcement.
3. Enforce required JWT secret.
4. Harden reset token flow.
5. Add `helmet` + rate limits.
6. Reduce exposed user fields.
7. Migrate token storage strategy (frontend + backend session model).

## Notes
- Keep this file as the single tracking document for security tasks.
- Convert each finding into issue tickets with owner + ETA before implementation.
