# KT (Knowledge Transfer) Documentation
## Vital Health Hub - Multi-Tenant Healthcare Platform

Last Updated: March 6, 2026

## Document Index
1. [SRS - Software Requirements Specification](./01_SRS_Software_Requirements_Specification.md)
2. [Architecture Document](./02_Architecture_Document.md)
3. [Data Flow Diagrams (DFD)](./03_Data_Flow_Diagrams.md)
4. [Tenant-Aware Login Analysis & Bug Hunt](./04_Tenant_Aware_Login_Analysis.md)
5. [Operational Flow Diagrams](./05_Flow_Diagrams.md)
6. [Future Scope & Roadmap](./06_Future_Scope.md)
7. [Module Functionality Reference](./07_Module_Functionality_Reference.md)

## Current Implementation Status (as of March 6, 2026)
- Multi-tenant DB-per-organization architecture is implemented.
- `POST /nh/api/v1/auth/login` now supports tenant auto-resolution by email when org slug/subdomain is not provided.
- Login response now includes organization context (`organization.slug`, modules, status, etc.).
- Frontend now persists resolved tenant slug after login for subsequent authenticated API calls.

## Critical Open Risks
- Email-based tenant resolution currently applies only to `/auth/login` (not full password-reset lifecycle).
- Passport strategies are still configured but not the primary auth path; technical debt remains.

## Suggested Reading Order
1. Start with `04_Tenant_Aware_Login_Analysis.md` for bug-hunt findings.
2. Review `02_Architecture_Document.md` for system-level design.
3. Use `01_SRS_Software_Requirements_Specification.md` and `07_Module_Functionality_Reference.md` for requirements and feature map.
