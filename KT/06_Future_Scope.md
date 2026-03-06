# Future Scope and Roadmap
## Vital Health Hub

Version: 3.0  
Date: March 6, 2026

## P0 (Immediate)
### 1. Verify Tenant-Safe Settings Refactor
- Add integration tests to confirm settings and data-management operations are isolated per tenant.
- Add regression tests for module operations settings in lab/radiology/pharmacy flows.

### 2. Password Recovery Tenant Resolution
- Extend controlled email-based tenant resolution to `POST /auth/forgot-password`.
- Keep explicit slug override support for ambiguous email cases.

### 3. Tenant Routing Test Suite
- Add API tests for:
  - slug-based routing
  - subdomain routing
  - email-based routing
  - ambiguity and suspended-org branches

## P1 (High Priority)
### 4. Token Tenant Claims
- Include tenant identifier (`orgId` or `slug`) in NH JWT payload.
- Validate claim against resolved tenant on each request.

### 5. Subscription Enforcement Layer
- Enforce enabled modules and subscription status at middleware level.
- Return clear errors for disabled modules/expired subscriptions.

### 6. Audit Logging
- Add immutable audit logs for org lifecycle and auth-sensitive operations.

## P2 (Medium)
### 7. Platform Observability
- Structured logs with tenant and request correlation IDs.
- Metrics for tenant connection count, auth failures by cause, and latency.

### 8. Operational Hardening
- Brute-force login protection, rate limiting, and account lockout.
- 2FA for high-privilege roles.

### 9. Data Export and Compliance
- Formal audit exports and compliance-ready reports.
- Policy-driven retention and purge controls.

## P3 (Long-Term)
### 10. Cross-Tenant Role Federation
- Support users who belong to multiple organizations with explicit org-switching.

### 11. Mobile and Patient Portals
- Mobile workflows for bedside operations.
- Patient-facing portal for reports, appointments, and billing.

### 12. Smart Clinical Features
- Predictive alerts, triage prioritization, and anomaly detection on vitals.

## Technical Debt Register
- Legacy/passive passport config cleanup.
- Standardization of model registration for all NH models.
- Improve frontend chunk splitting to reduce large bundle warnings.
- Centralized env schema validation.
