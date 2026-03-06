# Data Flow Diagrams (DFD)
## Vital Health Hub

Version: 3.0  
Date: March 6, 2026

## 1. Level 0 (Context Diagram)
```mermaid
flowchart LR
  GMU[Grandmaster User] --> SYS[Vital Health Hub]
  HSU[Hospital Staff User] --> SYS
  SYS --> MDB[(MongoDB Platform + Tenant DBs)]
  SYS --> SMTP[(SMTP Server)]
```

## 2. Level 1 (Major Processes)
```mermaid
flowchart TB
  A1[1.0 Grandmaster Management]
  A2[2.0 Tenant Auth & Access]
  A3[3.0 Hospital Operations]
  A4[4.0 Clinical Services]
  A5[5.0 Billing & Reporting]

  D1[(D1 Platform DB)]
  D2[(D2 Tenant DBs)]
  D3[(D3 Browser Storage)]

  A1 <--> D1
  A2 <--> D1
  A2 <--> D2
  A3 <--> D2
  A4 <--> D2
  A5 <--> D2
  A2 <--> D3
```

## 3. Level 2: Tenant-Aware Login
```mermaid
flowchart TD
  IN[Email + Password] --> P1[POST /nh/api/v1/auth/login]
  P1 --> P2[Tenant Resolver]

  P2 --> C1{Slug header/subdomain present?}
  C1 -- Yes --> P3[Resolve org by slug]
  C1 -- No --> C2{Path is /auth/login?}

  C2 -- Yes --> P4[Resolve org by email]
  C2 -- No --> P5[Continue without tenant context]

  P4 --> C3{Single org match?}
  C3 -- No, multiple --> E1[409 Multiple orgs]
  C3 -- No, none --> P5
  C3 -- Yes --> P6[Attach req.tenant + connection]

  P3 --> C4{Org suspended?}
  P6 --> C4
  C4 -- Yes --> E2[403 Suspended]
  C4 -- No --> P7[Auth controller query User model in tenant DB]

  P7 --> C5{Credentials valid?}
  C5 -- No --> E3[401 Invalid credentials]
  C5 -- Yes --> OUT[Return token + user + organization]
```

## 4. Level 2: Authenticated NH Request
```mermaid
flowchart TD
  R1[Client request with Bearer token + x-org-slug] --> R2[Tenant Resolver]
  R2 --> R3[Attach req.tenantConn]
  R3 --> R4[authenticate middleware]
  R4 --> R5[authorize middleware]
  R5 --> R6[NH controller via getModel(req,...)]
  R6 --> R7[(Tenant DB)]
  R7 --> R8[Response]
```

## 5. Level 2: Organization Onboarding
```mermaid
flowchart TD
  O1[Grandmaster submits onboarding form] --> O2[Validate payload]
  O2 --> O3[Generate slug + dbName]
  O3 --> O4[Create GM_Organization status=onboarding]
  O4 --> O5[Create tenant DB connection]
  O5 --> O6[Seed tenant super_admin user]
  O6 --> O7[Set org status=active]
  O7 --> O8[Return organization]

  O6 --> E1[On failure: delete org record and return error]
```

## 6. Data Stores
- D1 Platform DB:
  - `GM_Organization`, `GM_Subscription`, `GM_SubscriptionPlan`, `GM_GrandmasterUser`, etc.
- D2 Tenant DB(s):
  - `User`, `Patient`, `Admission`, `Bed`, `Invoice`, `LabTest`, `Prescription`, etc.
- D3 Browser storage:
  - `token`, `user`, `org_slug`.

## 7. Integrity Notes
- Tenant context must be established before NH model resolution.
- Missing/incorrect tenant context can cause default DB reads/writes.
- Settings and data-management flows now use tenant-bound models; keep regression tests to prevent fallback to default DB models.
