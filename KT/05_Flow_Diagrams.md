# Operational Flow Diagrams
## Vital Health Hub

Version: 3.0  
Date: March 6, 2026

## 1. End-to-End Tenant Onboarding Flow
```mermaid
flowchart TD
  G1[Grandmaster Login] --> G2[Open Organizations > Onboard]
  G2 --> G3[Submit org details + admin details + admin password]
  G3 --> G4[Validate input]
  G4 --> G5[Generate slug + tenant dbName]
  G5 --> G6[Create GM_Organization status=onboarding]
  G6 --> G7[Create tenant DB connection]
  G7 --> G8[Create tenant super_admin user]
  G8 --> G9[Set org status=active]
  G9 --> G10[Return org created]
```

## 2. Hospital Login Flow (Current)
```mermaid
flowchart TD
  L1[User opens /login] --> L2[Enter email + password]
  L2 --> L3[POST /nh/api/v1/auth/login]
  L3 --> L4[Tenant resolution: slug -> subdomain -> email]
  L4 --> L5[Query tenant User model]
  L5 --> L6{Credential valid?}
  L6 -- No --> L7[401 Invalid email/password]
  L6 -- Yes --> L8[Return token + user + organization]
  L8 --> L9[Frontend stores token + org_slug]
  L9 --> L10[Navigate to dashboard]
```

## 3. Authenticated API Request Flow
```mermaid
flowchart TD
  A1[Frontend API call] --> A2[Attach Bearer token + x-org-slug]
  A2 --> A3[resolveTenant middleware]
  A3 --> A4[authenticate middleware]
  A4 --> A5[authorize middleware]
  A5 --> A6[Controller uses getModel(req,...)]
  A6 --> A7[Execute against tenant DB]
  A7 --> A8[Return response]
```

## 4. Dashboard Data Flow
```mermaid
flowchart LR
  D1[Dashboard page] --> D2[GET /nh/api/v1/dashboard]
  D2 --> D3[Role resolution and view selection]
  D3 --> D4[Aggregate tenant stats from models]
  D4 --> D5[Cards + stats payload]
  D5 --> D6[Render admin/doctor/nurse perspective]
```

## 5. Admission Lifecycle Flow
```mermaid
flowchart TD
  P1[Create/Select patient] --> P2[Create admission]
  P2 --> P3[Assign bed and doctor]
  P3 --> P4[In-stay operations: vitals/lab/radiology/pharmacy/tasks]
  P4 --> P5[Generate invoice and finalize billing]
  P5 --> P6[Discharge admission]
  P6 --> P7[Release bed]
```

## 6. Visual Access Permission Flow
```mermaid
flowchart TD
  V1[Incoming request] --> V2[Map URL to module]
  V2 --> V3[Map HTTP method to action]
  V3 --> V4[Load visual access settings]
  V4 --> V5{User module override exists?}
  V5 -- Yes --> V6[Apply strict action/restrictedFeature checks]
  V5 -- No --> V7[Fallback to role hierarchy]
  V6 --> V8[Allow or 403]
  V7 --> V8
```

## 7. Subscription Impact Flow
```mermaid
flowchart TD
  S1[Assign plan to organization] --> S2[Store status and dates]
  S2 --> S3[Record payment history]
  S3 --> S4[Monitor expiry/grace]
  S4 --> S5[Suspend/reactivate org based on policy]
```

## 8. Failure Paths to Monitor
- Tenant ambiguity on login email -> `409`.
- Suspended organization -> `403`.
- Missing/stale `org_slug` on client -> tenant context mismatch.
- Add regression checks to ensure settings/data-management/model-ops paths never regress to default-DB model usage.
