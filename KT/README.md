# KT (Knowledge Transfer) Documentation
## Vital Health Hub — Multi-Tenant Healthcare Management Platform

---

## 📁 Document Index

| # | Document | Description |
|---|----------|-------------|
| 01 | [SRS — Software Requirements Specification](./01_SRS_Software_Requirements_Specification.md) | Complete functional & non-functional requirements, API endpoints, data models |
| 02 | [Architecture Document](./02_Architecture_Document.md) | System architecture, multi-tenancy strategy, auth design, deployment topology |
| 03 | [Data Flow Diagrams](./03_Data_Flow_Diagrams.md) | Level 0-2 DFDs covering all major subsystems and data stores |
| 04 | [Tenant-Aware Login Analysis](./04_Tenant_Aware_Login_Analysis.md) | Gap analysis of the current login flow, proposed solution, impact assessment |
| 05 | [Flow Diagrams](./05_Flow_Diagrams.md) | Operational flows: onboarding, login, admission, RBAC, subscription lifecycle |
| 06 | [Future Scope & Roadmap](./06_Future_Scope.md) | Prioritized roadmap (P0-P3), technical debt, scalability considerations |
| 07 | [Module Functionality Reference](./07_Module_Functionality_Reference.md) | Detailed per-module capability guide for both Grandmaster and Hospital portals |
| 08 | [Unit Test Case Catalog](./08_Unit_Test_Cases.md) | Backend-focused unit test catalog and module-wise coverage distribution |

---

## 🏗️ Quick Architecture Summary

```
Frontend (React + Vite + Tailwind)
  ├── /grandmaster/*  → Platform admin portal
  └── /*              → Hospital management portal

Backend (Node.js + Express)
  ├── /gm/api/v1/*    → Grandmaster API (GM_ models)
  └── /nh/api/v1/*    → Hospital API (NH_ models)

Database (MongoDB Atlas)
  ├── hospital_management     → Platform DB (GM_ collections)
  ├── nh_tenant_hospital_a    → Tenant DB
  ├── nh_tenant_hospital_b    → Tenant DB
  └── ...                     → N tenant databases
```

## ⚠️ Critical Gap

**The tenant-aware login flow is not yet implemented.** Hospital users created during onboarding (stored in tenant databases) cannot log in via `/login`. See document #04 for the full analysis and proposed solution.

## 🔑 Default Credentials

### Grandmaster Portal (`/grandmaster/login`)
Run `node backend/src/seeders/seedGrandmaster.js` first.
- Email: `grandmaster@vitalhub.com`
- Password: `Grandmaster@2024!`

### Hospital Portal (`/login`) — Main DB only
Run `node backend/src/seeders/seed.js` first.
- Super Admin: `superadmin@example.com` / `Sohel@34892`
- Doctor: `doctor@example.com` / `Sohel@34892`
- Nurse: `nurse@example.com` / `Sohel@34892`
- See `backend/src/seeders/credentials.md` for all roles
