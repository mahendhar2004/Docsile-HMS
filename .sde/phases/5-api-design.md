# Phase 5 — API Design

**Date:** 2026-09-21
**Status:** Accepted
**Author:** Backend Agent (SDE-5)
**Phase:** 5 — REST/OpenAPI surface for 18 Edge Function modules

---

## 1. Scope

Map all 229 exported server-action functions across 17 `actions.ts` files onto a
REST/OpenAPI surface organized per the 18 module boundaries locked in Phase 2 §3 and
implemented per ADR-006's one-Edge-Function-per-module / Hono-router pattern.

Output artefact: `.sde/schemas/openapi.yaml` (OpenAPI 3.0.3, Redocly-lint-clean).

---

## 2. Endpoint Count

| Module              | Edge Function         | Endpoints | Permission scope              |
|---------------------|-----------------------|-----------|-------------------------------|
| auth                | `auth`                | 3         | public (login), self (refresh/logout) |
| health              | `health`              | 2         | public                        |
| patient-care        | `patient-care`        | 28        | `patient:*`, `inpatient:*`    |
| billing             | `billing`             | 5         | `billing:*`                   |
| pharmacy            | `pharmacy`            | 21        | `pharmacy:*`                  |
| labs                | `labs`                | 14        | `labs:*`                      |
| optical             | `optical`             | 16        | `optical:*`                   |
| insurance           | `insurance`           | 12        | `insurance:*`                 |
| queue               | `queue`               | 3         | `queue:view`                  |
| doctor              | `doctor`              | 11        | `doctor:*`                    |
| staff               | `staff`               | 12        | `staff:*`                     |
| settings            | `settings`            | 33        | `settings:*`                  |
| analytics           | `analytics`           | 19        | `reports:view`                |
| reports             | `reports`             | 17        | `reports:view`                |
| workup              | `workup`              | 4         | `workup:*`                    |
| expenses            | `expenses`            | 10        | `expenses:*`                  |
| dues-followups      | `dues-followups`      | 8         | `dues:*`                      |
| call-logs           | `call-logs`           | 8         | `call_logs:*`, webhook unauth |
| license-tracker     | `license-tracker`     | 6         | `license_tracker:*`           |
| dashboard           | `dashboard`           | 2         | `reports:view`                |
| **TOTAL**           |                       | **234**   |                               |

---

## 3. Auth Scoping Decision

### 3.1 Endpoints provided

Only three auth endpoints are exposed:

| Method | Path           | Reason                                                        |
|--------|----------------|---------------------------------------------------------------|
| POST   | /auth/login    | Email + password → 15-min access token + 7-day refresh token |
| POST   | /auth/refresh  | Refresh token rotation: old revoked, new pair issued          |
| POST   | /auth/logout   | Revokes jti in `token_revocation` table; clears cookie        |

`/auth/register` and `/auth/forgot-password` are **intentionally absent**. Staff accounts
are provisioned by an admin via `POST /staff/members`. Self-service account creation is not
a feature of this system.

### 3.2 Token model

| Token     | Delivery          | Expiry | Revocation                              |
|-----------|-------------------|--------|-----------------------------------------|
| Access    | HttpOnly cookie   | 15 min | Short expiry; no server-side revocation needed |
| Refresh   | HttpOnly cookie   | 7 days | jti stored hashed in `token_revocation`; invalidated on every use |

### 3.3 Permission enforcement fix

The existing codebase has `requireServerPermission()` disabled (noted in `context.json`
under `notes.permissionsDisabled`). In the new Edge Function architecture, the permission
guard is structural — every route in `index.ts` must declare `requirePermission('...')` as
a Hono middleware argument. Any route missing it is visibly absent in the one-screen file
and fails the CI lint rule that greps for `app.<method>` calls without `requirePermission`.

---

## 4. Pagination Strategy

Per Phase 2 §13.2:

| Endpoint pattern              | Style  | Parameters                         | Rationale                               |
|-------------------------------|--------|------------------------------------|-----------------------------------------|
| Patient list by date          | Offset | `?page=1&pageSize=50`              | Date-scoped → bounded result set        |
| Inpatient list                | Offset | `?page=1&pageSize=50`              | Date/status scoped                      |
| Lab bills / optical bills     | Offset | `?page=1&pageSize=50`              | Date-scoped                             |
| Insurance claims              | Offset | `?page=1&pageSize=50`              | Date-scoped                             |
| Follow-ups                    | Offset | `?page=1&pageSize=50`              | Date-scoped                             |
| Call logs                     | Offset | `?page=1&pageSize=50`              | Date-scoped                             |
| Patient search                | Cursor | `?cursor=<opaqueToken>&limit=10`   | Unbounded; `.limit(10)` in existing code |
| Reports patient search        | Cursor | `?cursor=<opaqueToken>&limit=8`    | Matches existing `.limit(8)` query      |
| All other GET lists           | None   | Fixed server-side limit            | Small master-data tables (≤200 rows)    |

---

## 5. Rate Limit Table

| Endpoint class                           | Limit            | Window | Key          |
|------------------------------------------|------------------|--------|--------------|
| `POST /auth/login`                       | 5 requests       | 1 min  | per client IP |
| `POST /auth/refresh`                     | 30 requests      | 1 min  | per user jti  |
| `GET /reports/exports/*`                 | 10 requests      | 1 min  | per user      |
| `GET /analytics/*`                       | 30 requests      | 1 min  | per user      |
| `POST /call-logs/sync`                   | 6 requests       | 1 min  | per user      |
| `POST /call-logs/webhook/exotel`         | unrestricted     | —      | token-validated only |
| `GET /health*`                           | 60 requests      | 1 min  | per IP        |
| All other authenticated endpoints        | 100 requests     | 1 min  | per user      |

Rate limit enforcement: implemented as a Supabase Edge Function middleware layer using
a sliding-window counter in a Supabase KV store or via the `rate_limit` table. Headers
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` are returned on all
authenticated endpoints. 429 responses follow the standard error envelope.

---

## 6. Response Envelope

Every response from every Edge Function uses this envelope:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 247
  }
}
```

`meta` is omitted for non-paginated responses. Error responses use the same envelope with
`data: null` and a descriptive `message` (resource type + identifier + what was invalid).

---

## 7. Module-by-Module Endpoint Catalogue

### 7.1 auth (3 endpoints)

| Method | Path           | Permission    | Source                           |
|--------|----------------|---------------|----------------------------------|
| POST   | /auth/login    | public        | `(auth)/login/actions.ts`        |
| POST   | /auth/refresh  | cookie-only   | new (refresh rotation per ADR-005) |
| POST   | /auth/logout   | cookie-only   | `src/app/api/logout/route.ts`    |

### 7.2 health (2 endpoints)

| Method | Path        | Permission | Source |
|--------|-------------|------------|--------|
| GET    | /health     | public     | new    |
| GET    | /health/db  | public     | new    |

### 7.3 patient-care (28 endpoints)

| Method | Path                                       | Permission          | Source function                    |
|--------|--------------------------------------------|---------------------|------------------------------------|
| GET    | /patient-care/patients                     | `patient:view`      | `getPatients`                      |
| GET    | /patient-care/patients/search              | `patient:view`      | `searchExistingPatients`           |
| GET    | /patient-care/patients/next-id             | `patient:create`    | `getNextPatientId`                 |
| GET    | /patient-care/patients/registration-form   | `patient:create`    | `getPatientRegistrationFormData`   |
| POST   | /patient-care/patients                     | `patient:create`    | `createPatient`                    |
| GET    | /patient-care/patients/{id}                | `patient:view`      | `getPatientById`                   |
| PATCH  | /patient-care/patients/{id}                | `patient:edit`      | `updatePatientInfo`                |
| DELETE | /patient-care/patients/{id}                | `patient:delete`    | `deletePatient`                    |
| PATCH  | /patient-care/patients/{id}/status         | `patient:edit`      | `updatePatientStatus`              |
| PATCH  | /patient-care/patients/{id}/date           | `patient:edit`      | `movePatientToDate`                |
| GET    | /patient-care/patients/{id}/last-visit     | `patient:view`      | `getPatientWithLastVisit`          |
| GET    | /patient-care/patients/{id}/receipt        | `billing:view`      | `getPatientReceiptData`            |
| POST   | /patient-care/patients/{id}/services       | `billing:create`    | `addServiceToPatient`              |
| POST   | /patient-care/patients/{id}/prescriptions  | `billing:create`    | `createPrescriptionWithBilling`    |
| GET    | /patient-care/inpatients                   | `inpatient:view`    | `getInPatients`                    |
| GET    | /patient-care/inpatients/next-id           | `inpatient:create`  | `getNextInPatientId`               |
| GET    | /patient-care/inpatients/admission-form    | `inpatient:create`  | `getInPatientAdmissionFormData`    |
| POST   | /patient-care/inpatients                   | `inpatient:create`  | `createInPatient`                  |
| GET    | /patient-care/inpatients/{id}              | `inpatient:view`    | `getInPatientById`                 |
| PATCH  | /patient-care/inpatients/{id}              | `inpatient:edit`    | `updateInPatient`                  |
| PATCH  | /patient-care/inpatients/{id}/basic-info   | `inpatient:edit`    | `updateInPatientBasicInfo`         |
| PATCH  | /patient-care/inpatients/{id}/details      | `inpatient:edit`    | `updateInPatientDetails`           |
| PATCH  | /patient-care/inpatients/{id}/status       | `inpatient:edit`    | `updateInPatientStatus`            |
| POST   | /patient-care/inpatients/{id}/payments     | `inpatient:payment` | `addInPatientPayment`              |
| POST   | /patient-care/inpatients/{id}/discharge    | `inpatient:discharge`| `dischargeInPatient`              |
| DELETE | /patient-care/inpatients/{id}              | `inpatient:delete`  | `deleteInPatient`                  |
| GET    | /patient-care/dropdown-options             | `patient:view`      | `getDropdownOptions`               |
| POST   | /patient-care/dropdown-options             | `patient:edit`      | `addDropdownOption`                |

### 7.4 billing (5 endpoints)

| Method | Path                                          | Permission       | Source / notes                              |
|--------|-----------------------------------------------|------------------|---------------------------------------------|
| GET    | /billing/daily                                | `billing:view`   | Aggregates today's Prescription revenue     |
| GET    | /billing/prescriptions                        | `billing:view`   | List prescriptions with amounts/payments    |
| GET    | /billing/prescriptions/{id}                   | `billing:view`   | Single prescription with items + payments   |
| POST   | /billing/prescriptions/{id}/payments          | `billing:create` | Record additional payment on existing Rx    |
| DELETE | /billing/prescriptions/{id}/payments/{payId}  | `billing:delete` | Void a payment (admin only)                 |

### 7.5 pharmacy (21 endpoints)

| Method | Path                                        | Permission                   | Source function          |
|--------|---------------------------------------------|------------------------------|--------------------------|
| GET    | /pharmacy/medicines                         | `pharmacy:view`              | `getMedicines`           |
| POST   | /pharmacy/medicines                         | `pharmacy:manage_stock`      | `createMedicine`         |
| PATCH  | /pharmacy/medicines/{id}                    | `pharmacy:manage_stock`      | `updateMedicine`         |
| DELETE | /pharmacy/medicines/{id}                    | `pharmacy:manage_stock`      | `deleteMedicine` (soft)  |
| GET    | /pharmacy/stock                             | `pharmacy:view`              | `getStock`               |
| POST   | /pharmacy/stock                             | `pharmacy:manage_stock`      | `addStock`               |
| PATCH  | /pharmacy/stock/{id}                        | `pharmacy:manage_stock`      | `updateStock`            |
| GET    | /pharmacy/stock/summary                     | `pharmacy:view`              | `getStockSummary`        |
| GET    | /pharmacy/stock/search                      | `pharmacy:view`              | `searchMedicineStock`    |
| GET    | /pharmacy/suppliers                         | `pharmacy:view`              | `getSuppliers`           |
| POST   | /pharmacy/suppliers                         | `pharmacy:manage_stock`      | `createSupplier`         |
| PATCH  | /pharmacy/suppliers/{id}                    | `pharmacy:manage_stock`      | `updateSupplier`         |
| DELETE | /pharmacy/suppliers/{id}                    | `pharmacy:manage_stock`      | `deleteSupplier` (soft)  |
| GET    | /pharmacy/purchase-orders                   | `pharmacy:purchase_orders`   | `getPurchaseOrders`      |
| POST   | /pharmacy/purchase-orders                   | `pharmacy:purchase_orders`   | `createPurchaseOrder`    |
| POST   | /pharmacy/purchase-orders/{id}/receive      | `pharmacy:purchase_orders`   | `receivePurchaseOrder`   |
| PATCH  | /pharmacy/purchase-orders/{id}/status       | `pharmacy:purchase_orders`   | `updatePOStatus`         |
| GET    | /pharmacy/bills                             | `pharmacy:view`              | `getPharmacyBills`       |
| POST   | /pharmacy/bills                             | `pharmacy:create`            | `createPharmacyBill`     |
| GET    | /pharmacy/pending-medicines                 | `pharmacy:view`              | `getPendingMedicines`    |
| GET    | /pharmacy/patients/{patientId}/prescription | `pharmacy:view`              | `getPatientPrescription` |

### 7.6 labs (14 endpoints)

| Method | Path                                        | Permission       | Source function              |
|--------|---------------------------------------------|------------------|------------------------------|
| GET    | /labs/labs                                  | `labs:view`      | `getLabs`                    |
| POST   | /labs/labs                                  | `labs:manage`    | `createLab`                  |
| GET    | /labs/labs/{id}                             | `labs:view`      | `getLabById`                 |
| PATCH  | /labs/labs/{id}                             | `labs:manage`    | `updateLab`                  |
| DELETE | /labs/labs/{id}                             | `labs:manage`    | `deleteLab` (soft)           |
| GET    | /labs/labs/{labId}/investigations           | `labs:view`      | `getLabInvestigations`       |
| GET    | /labs/investigations                        | `labs:view`      | `getAllInvestigations`        |
| POST   | /labs/investigations                        | `labs:manage`    | `createInvestigation`        |
| PUT    | /labs/labs/{labId}/investigations           | `labs:manage`    | `updateLabInvestigations` (replace-all) |
| GET    | /labs/patients/{patientId}/investigations   | `labs:view`      | `getPatientInvestigations`   |
| GET    | /labs/pending-investigations                | `labs:view`      | `getPendingLabInvestigations`|
| GET    | /labs/bills                                 | `labs:view`      | `getLabBills`                |
| POST   | /labs/bills                                 | `labs:create`    | `createLabBills` (multi-bill)|
| GET    | /labs/bills/{id}                            | `labs:view`      | `getLabBillById`             |

### 7.7 optical (16 endpoints)

| Method | Path                                      | Permission         | Source function             |
|--------|-------------------------------------------|--------------------|------------------------------|
| GET    | /optical/products                         | `optical:view`     | `getOpticalProducts`         |
| POST   | /optical/products                         | `optical:manage`   | `createOpticalProduct`       |
| PATCH  | /optical/products/{id}                    | `optical:manage`   | `updateOpticalProduct`       |
| DELETE | /optical/products/{id}                    | `optical:manage`   | `deleteOpticalProduct` (soft)|
| GET    | /optical/stock                            | `optical:view`     | `getOpticalStock`            |
| POST   | /optical/stock                            | `optical:manage`   | `addOpticalStock` (upsert)   |
| PATCH  | /optical/stock/{id}                       | `optical:manage`   | `updateOpticalStock`         |
| GET    | /optical/stock/summary                    | `optical:view`     | `getStockSummary`            |
| GET    | /optical/stock/search                     | `optical:view`     | `searchOpticalStock`         |
| GET    | /optical/bills                            | `optical:view`     | `getOpticalBills`            |
| POST   | /optical/bills                            | `optical:create`   | `createOpticalBill`          |
| PATCH  | /optical/bills/{id}/status                | `optical:edit`     | `updateOpticalBillStatus`    |
| GET    | /optical/patients/{patientId}/ar-reading  | `optical:view`     | `getPatientWithARReading`    |
| GET    | /optical/settings                         | `settings:view`    | `getOpticalSettings`         |
| PATCH  | /optical/settings                         | `settings:edit`    | `updateOpticalSettings`      |
| GET    | /optical/hospital-profile                 | `optical:view`     | `getOpticalHospitalProfile`  |

### 7.8 insurance (12 endpoints)

| Method | Path                                         | Permission              | Source function                  |
|--------|----------------------------------------------|-------------------------|----------------------------------|
| GET    | /insurance/companies                         | `insurance:view`        | `getInsuranceCompanies`          |
| GET    | /insurance/companies/all                     | `insurance:view`        | `getAllInsuranceCompanies`       |
| POST   | /insurance/companies                         | `insurance:manage`      | `createInsuranceCompany`         |
| PATCH  | /insurance/companies/{id}                    | `insurance:manage`      | `updateInsuranceCompany`         |
| DELETE | /insurance/companies/{id}                    | `insurance:manage`      | `deleteInsuranceCompany` (soft)  |
| GET    | /insurance/claims                            | `insurance:view`        | `getInsuranceClaims`             |
| POST   | /insurance/claims                            | `insurance:create`      | `createInsuranceClaim`           |
| GET    | /insurance/claims/{id}                       | `insurance:view`        | `getInsuranceClaimById`          |
| PATCH  | /insurance/claims/{id}/status                | `insurance:edit`        | `updateInsuranceClaimStatus`     |
| PATCH  | /insurance/claims/{id}/details               | `insurance:edit`        | `updateInsuranceClaimDetails`    |
| POST   | /insurance/claims/{id}/payments              | `insurance:payment`     | `addInsurancePatientPayment`     |
| GET    | /insurance/inpatients/search                 | `insurance:view`        | `searchInPatientsForInsurance`   |

### 7.9 queue (3 endpoints)

| Method | Path              | Permission    | Source function                           |
|--------|-------------------|---------------|-------------------------------------------|
| GET    | /queue/opd        | `queue:view`  | `getDoctorQueue` (doctor/actions.ts)      |
| GET    | /queue/workup     | `queue:view`  | `getWorkupQueue` (workup/actions.ts)      |
| GET    | /queue/inpatients | `queue:view`  | Reads InPatient table for bed/status board|

### 7.10 doctor (11 endpoints)

| Method | Path                                         | Permission        | Source function               |
|--------|----------------------------------------------|-------------------|-------------------------------|
| GET    | /doctor/queue                                | `doctor:view`     | `getDoctorQueue`              |
| GET    | /doctor/patients/{patientId}/consultation    | `doctor:view`     | `getPatientForConsultation`   |
| POST   | /doctor/patients/{patientId}/prescriptions   | `doctor:prescribe`| `savePrescription` (upsert)   |
| GET    | /doctor/reference-data                       | `doctor:view`     | `getPrescriptionReferenceData`|
| GET    | /doctor/medicine-master                      | `doctor:view`     | `getMedicineMaster`           |
| GET    | /doctor/investigation-master                 | `doctor:view`     | `getInvestigationMaster`      |
| GET    | /doctor/prescription-templates               | `doctor:view`     | `getPredefinedTemplates`      |
| GET    | /doctor/dropdown-options                     | `doctor:view`     | `getDropdownOptions`          |
| POST   | /doctor/dropdown-options                     | `doctor:edit`     | `addDropdownOption`           |
| POST   | /doctor/medicines                            | `doctor:edit`     | `createMedicine`              |
| GET    | /doctor/patients/{patientId}/receipt         | `billing:view`    | `getReceiptData`              |

### 7.11 staff (12 endpoints)

| Method | Path                                  | Permission              | Source function         |
|--------|---------------------------------------|-------------------------|-------------------------|
| GET    | /staff/members                        | `staff:view`            | `getStaffMembers`       |
| POST   | /staff/members                        | `staff:create`          | `createStaffMember`     |
| GET    | /staff/members/{id}                   | `staff:view`            | `getStaffMember`        |
| PATCH  | /staff/members/{id}                   | `staff:edit`            | `updateStaffMember`     |
| PATCH  | /staff/members/{id}/active            | `staff:deactivate`      | `toggleStaffActive`     |
| POST   | /staff/members/{id}/reset-password    | `staff:edit`            | `resetStaffPassword`    |
| GET    | /staff/roles                          | `staff:view`            | `getRoles`              |
| POST   | /staff/roles                          | `staff:manage_roles`    | `createRole`            |
| PATCH  | /staff/roles/{id}                     | `staff:manage_roles`    | `updateRole`            |
| PATCH  | /staff/roles/{id}/permissions         | `staff:manage_roles`    | `updateRolePermissions` |
| DELETE | /staff/roles/{id}                     | `staff:manage_roles`    | `deleteRole`            |
| POST   | /staff/roles/seed                     | `staff:manage_roles`    | `seedSystemRoles`       |

### 7.12 settings (33 endpoints)

| Method | Path                                       | Permission       | Source function                   |
|--------|--------------------------------------------|------------------|-----------------------------------|
| GET    | /settings/service-templates               | `settings:view`  | `getServiceTemplates`             |
| POST   | /settings/service-templates               | `settings:edit`  | `createServiceTemplate`           |
| PATCH  | /settings/service-templates/{id}          | `settings:edit`  | `updateServiceTemplate`           |
| DELETE | /settings/service-templates/{id}          | `settings:edit`  | `deleteServiceTemplate`           |
| GET    | /settings/hospital-profile                | `settings:view`  | `getHospitalProfile`              |
| PATCH  | /settings/hospital-profile                | `settings:edit`  | `updateHospitalProfile`           |
| GET    | /settings/print-config                    | `settings:view`  | `getDefaultPrintConfig`           |
| PATCH  | /settings/print-config                    | `settings:edit`  | `saveDefaultPrintConfig`          |
| PATCH  | /settings/nav-style                       | `settings:edit`  | `updateNavStyle`                  |
| GET    | /settings/prescription-templates         | `settings:view`  | `getPrescriptionTemplates`        |
| POST   | /settings/prescription-templates         | `settings:edit`  | `createPrescriptionTemplate`      |
| PATCH  | /settings/prescription-templates/{id}    | `settings:edit`  | `updatePrescriptionTemplate`      |
| DELETE | /settings/prescription-templates/{id}    | `settings:edit`  | `deletePrescriptionTemplate`      |
| GET    | /settings/inpatient-templates            | `settings:view`  | `getInpatientTemplates`           |
| POST   | /settings/inpatient-templates            | `settings:edit`  | `createInpatientTemplate`         |
| PATCH  | /settings/inpatient-templates/{id}       | `settings:edit`  | `updateInpatientTemplate`         |
| DELETE | /settings/inpatient-templates/{id}       | `settings:edit`  | `deleteInpatientTemplate`         |
| GET    | /settings/packages                        | `settings:view`  | `getPredefinedPackages`           |
| POST   | /settings/packages                        | `settings:edit`  | `createPredefinedPackage`         |
| PATCH  | /settings/packages/{id}                   | `settings:edit`  | `updatePredefinedPackage`         |
| DELETE | /settings/packages/{id}                   | `settings:edit`  | `deletePredefinedPackage`         |
| GET    | /settings/surgeries                       | `settings:view`  | `getPredefinedSurgeries`          |
| POST   | /settings/surgeries                       | `settings:edit`  | `createPredefinedSurgery`         |
| PATCH  | /settings/surgeries/{id}                  | `settings:edit`  | `updatePredefinedSurgery`         |
| DELETE | /settings/surgeries/{id}                  | `settings:edit`  | `deletePredefinedSurgery` (soft)  |
| GET    | /settings/discharges                      | `settings:view`  | `getPredefinedDischarges`         |
| POST   | /settings/discharges                      | `settings:edit`  | `createPredefinedDischarge`       |
| PATCH  | /settings/discharges/{id}                 | `settings:edit`  | `updatePredefinedDischarge`       |
| DELETE | /settings/discharges/{id}                 | `settings:edit`  | `deletePredefinedDischarge` (soft)|
| GET    | /settings/medicine-master                 | `settings:view`  | `getMedicineMasterList`           |
| POST   | /settings/medicine-master                 | `settings:edit`  | `createMedicineMaster`            |
| PATCH  | /settings/medicine-master/{id}            | `settings:edit`  | `updateMedicineMaster`            |
| DELETE | /settings/medicine-master/{id}            | `settings:edit`  | `deleteMedicineMaster`            |

### 7.13 analytics (19 endpoints)

All endpoints share the query parameters `?filter=today|week|month|year|custom&customStart=YYYY-MM-DD&customEnd=YYYY-MM-DD` and require permission `reports:view`.

| Method | Path                                           | Source function                       |
|--------|------------------------------------------------|---------------------------------------|
| GET    | /analytics/overview                            | `getAnalyticsOverview`                |
| GET    | /analytics/gender-distribution                 | `getGenderDistribution`               |
| GET    | /analytics/age-distribution                    | `getAgeDistribution`                  |
| GET    | /analytics/revenue-by-category                 | `getRevenueByCategory`                |
| GET    | /analytics/time-series                         | `getTimeSeries`                       |
| GET    | /analytics/top-services                        | `getTopServices`                      |
| GET    | /analytics/expense-breakdown                   | `getExpenseBreakdown`                 |
| GET    | /analytics/financial-summary                   | `getFinancialSummary`                 |
| GET    | /analytics/payment-mode-breakdown              | `getPaymentModeBreakdown`             |
| GET    | /analytics/doctor-performance                  | `getDoctorPerformance`                |
| GET    | /analytics/status-distribution                 | `getStatusDistribution`               |
| GET    | /analytics/common-diagnoses                    | `getCommonDiagnoses`                  |
| GET    | /analytics/common-medicines                    | `getCommonMedicines`                  |
| GET    | /analytics/top-prescribed-investigations       | `getTopPrescribedInvestigations`      |
| GET    | /analytics/top-pharmacy-sales                  | `getTopPharmacySales`                 |
| GET    | /analytics/top-lab-tests                       | `getTopLabTests`                      |
| GET    | /analytics/referral-stats                      | `getReferralStats`                    |
| GET    | /analytics/surgery-breakdown                   | `getSurgeryBreakdown`                 |
| GET    | /analytics/region-stats                        | `getRegionStats`                      |

### 7.14 reports (17 endpoints)

| Method | Path                                           | Permission      | Source function / file       |
|--------|------------------------------------------------|-----------------|------------------------------|
| GET    | /reports/patients/search                       | `reports:view`  | `searchPatients` (reports)   |
| GET    | /reports/patients/{patientId}/summary          | `reports:view`  | `getPatientSummary`          |
| GET    | /reports/patients/{patientId}/visits           | `reports:view`  | `getVisitHistory`            |
| GET    | /reports/patients/{patientId}/prescriptions    | `reports:view`  | `getPrescriptions`           |
| GET    | /reports/patients/{patientId}/inpatient        | `reports:view`  | `getInpatientRecords`        |
| GET    | /reports/patients/{patientId}/receipt          | `reports:view`  | `getReportReceiptData`       |
| GET    | /reports/patients/{patientId}/labs             | `reports:view`  | `getLabRecords`              |
| GET    | /reports/patients/{patientId}/billing          | `reports:view`  | `getBillingOverview`         |
| GET    | /reports/exports/patients                      | `reports:export`| `getExportPatients` (data)   |
| GET    | /reports/exports/prescriptions                 | `reports:export`| `getExportPrescriptions`     |
| GET    | /reports/exports/eye-readings                  | `reports:export`| `getExportEyeReadings`       |
| GET    | /reports/exports/inpatients                    | `reports:export`| `getExportInPatients`        |
| GET    | /reports/exports/insurance-claims              | `reports:export`| `getExportInsuranceClaims`   |
| GET    | /reports/exports/lab-bills                     | `reports:export`| `getExportLabBills`          |
| GET    | /reports/exports/pharmacy-bills                | `reports:export`| `getExportPharmacyBills`     |
| GET    | /reports/exports/optical-bills                 | `reports:export`| `getExportOpticalBills`      |
| GET    | /reports/exports/expenses                      | `reports:export`| `getExportExpenses`          |

### 7.15 workup (4 endpoints)

| Method | Path                                          | Permission       | Source function     |
|--------|-----------------------------------------------|------------------|----------------------|
| GET    | /workup/queue                                 | `workup:view`    | `getWorkupQueue`     |
| GET    | /workup/patients/{patientId}                  | `workup:view`    | `getPatientForWorkup`|
| POST   | /workup/patients/{patientId}/eye-readings     | `workup:create`  | `saveEyeReading` (upsert) |
| POST   | /workup/patients/{patientId}/start            | `workup:create`  | `startWorkup` (no-op; deprecated) |

### 7.16 expenses (10 endpoints)

| Method | Path                              | Permission        | Source function          |
|--------|-----------------------------------|-------------------|--------------------------|
| POST   | /expenses/categories/seed         | `expenses:manage` | `seedDefaultCategories`  |
| GET    | /expenses/categories              | `expenses:view`   | `getCategories`          |
| POST   | /expenses/categories              | `expenses:manage` | `createCategory`         |
| PATCH  | /expenses/categories/{id}         | `expenses:manage` | `updateCategory`         |
| DELETE | /expenses/categories/{id}         | `expenses:manage` | `deleteCategory`         |
| PATCH  | /expenses/categories/reorder      | `expenses:manage` | `reorderCategories` (bulk)|
| GET    | /expenses                         | `expenses:view`   | `getExpensesByDateRange` |
| POST   | /expenses                         | `expenses:create` | `createExpense`          |
| PATCH  | /expenses/{id}                    | `expenses:edit`   | `updateExpense`          |
| DELETE | /expenses/{id}                    | `expenses:delete` | `deleteExpense`          |

### 7.17 dues-followups (8 endpoints)

| Method | Path                                    | Permission    | Source function          |
|--------|-----------------------------------------|---------------|--------------------------|
| GET    | /dues-followups/dues                    | `dues:view`   | `getDues`                |
| GET    | /dues-followups/followups               | `dues:view`   | `getFollowUps`           |
| PATCH  | /dues-followups/dues/{id}/mark-paid     | `dues:edit`   | `markDueAsPaid`          |
| GET    | /dues-followups/doctors                 | `dues:view`   | `getDoctorList`          |
| GET    | /dues-followups/departments             | `dues:view`   | `getDepartmentList`      |
| GET    | /dues-followups/email-templates         | `dues:view`   | `getAvailableTemplates`  |
| GET    | /dues-followups/hospital-name           | `dues:view`   | `getHospitalDisplayName` |
| POST   | /dues-followups/send-email              | `dues:edit`   | `sendPatientEmail`       |

### 7.18 call-logs (8 endpoints)

| Method | Path                              | Permission          | Source function         |
|--------|-----------------------------------|---------------------|--------------------------|
| GET    | /call-logs/analytics              | `call_logs:view`    | `getCallAnalytics`       |
| GET    | /call-logs                        | `call_logs:view`    | `getCallLogs`            |
| GET    | /call-logs/stats                  | `call_logs:view`    | `getCallStats`           |
| PATCH  | /call-logs/{id}/notes             | `call_logs:edit`    | `updateCallNotes`        |
| PATCH  | /call-logs/{id}/patient           | `call_logs:edit`    | `linkCallToPatient`      |
| GET    | /call-logs/patients/search        | `call_logs:view`    | `searchPatients`         |
| POST   | /call-logs/sync                   | `call_logs:sync`    | `syncExotelCalls`        |
| POST   | /call-logs/webhook/exotel         | token-only (no JWT) | `api/exotel/webhook/route.ts` |

### 7.19 license-tracker (6 endpoints)

| Method | Path                                | Permission              | Source function              |
|--------|-------------------------------------|-------------------------|------------------------------|
| GET    | /license-tracker                    | `license_tracker:view`  | `getLicenses`                |
| POST   | /license-tracker                    | `license_tracker:create`| `createLicense`              |
| PATCH  | /license-tracker/{id}               | `license_tracker:edit`  | `updateLicense`              |
| DELETE | /license-tracker/{id}               | `license_tracker:delete`| `deleteLicense`              |
| PATCH  | /license-tracker/{id}/document      | `license_tracker:edit`  | `saveLicenseDocumentUrl`     |
| DELETE | /license-tracker/{id}/document      | `license_tracker:edit`  | `removeLicenseDocument`      |

### 7.20 dashboard (2 endpoints)

| Method | Path                   | Permission      | Source / notes                              |
|--------|------------------------|-----------------|---------------------------------------------|
| GET    | /dashboard/summary     | `reports:view`  | Aggregates today's patient + revenue stats  |
| GET    | /dashboard/quick-stats | `reports:view`  | YTD/MTD totals, active inpatient count      |

---

## 8. Surprises and Deviations Found During Mapping

### 8.1 `requireServerPermission()` universally disabled
Every `actions.ts` file calls `requireServerPermission()` but `context.json` notes it is
disabled at `src/lib/auth.ts` — any authenticated user has full access to everything. The
new Edge Function architecture makes this structurally non-bypassable (ADR-002 enforcement
via Hono middleware).

### 8.2 No distinct billing `actions.ts` exists
There is no `src/app/(hospital)/billing/actions.ts`. Billing creation is embedded in
`patients/actions.ts` (`createPrescriptionWithBilling`, `addServiceToPatient`) and payment
additions are embedded in `inpatients/actions.ts`. The billing Edge Function is a new
module that exposes the read/payment-management side without duplicating creation flows.

### 8.3 `data/` module maps to `reports` not a standalone module
The source has `src/app/(hospital)/data/actions.ts` with 9 bulk-export functions (`.limit(5000)`).
In the target, these belong in the `reports` Edge Function under `/reports/exports/*`.
No `data` Edge Function is needed.

### 8.4 `settings/actions.ts` contains user management functions
`getUsers`, `createUser`, `toggleUserActive` in `settings/actions.ts` actually belong to
the `staff` module semantically. These are duplicated (more complete versions exist in
`staff/actions.ts`). Mapped to the `staff` Edge Function; the settings versions are superseded.

### 8.5 `workup/startWorkup` is a no-op
`startWorkup()` in `workup/actions.ts` contains only a `revalidatePath()` call — patient
status is computed from data, not stored. The endpoint is included at
`POST /workup/patients/{patientId}/start` and marked deprecated to avoid breaking any
existing client calls during the migration.

### 8.6 `getDoctorQueue` and `getWorkupQueue` use identical 3-parallel-query patterns
Both functions run 3 parallel Supabase queries (appointment date, prescription date, eye
reading date) and merge by patientId. They differ only in the data fields selected and the
status computation function applied. Mapped separately: `GET /queue/opd` and `GET /queue/workup`,
both served by the `queue` Edge Function.

### 8.7 Exotel webhook accepts both form-urlencoded and JSON
`src/app/api/exotel/webhook/route.ts` reads `content-type` and handles both. The Edge
Function implementation must preserve this dual-format parsing. Mapped to
`POST /call-logs/webhook/exotel` with `requestBody` accepting both content types.

### 8.8 Pharmacy bill sequence is non-atomic in existing code
`createPharmacyBill` generates a bill number by querying max and incrementing — a race
condition under concurrent creates. The Edge Function implementation must replace this with
the `next_prescription_number(year)` RPC pattern or a DB-level sequence.

### 8.9 Analytics functions inconsistently apply permissions
Some analytics functions call `requireServerPermission('reports:view')` and some don't
(noted in original conversation). All 19 analytics endpoints must enforce `reports:view`
in the new architecture.

### 8.10 `due-followups/getDues` crosses four modules
`getDues` reads `Prescription`, `InPatient`, `LabBill`, and `PharmacyBill` in one function.
In the Edge Function, the `dues-followups` repository directly queries all four tables
(service_role key allows this without inter-module API calls).

---

## 8.11 Post-generation review fixes (applied after the OpenAPI YAML was written)

An independent architecture review (architect-agent) of the generated spec found several
issues, fixed directly in `openapi.yaml` before commit:

- **CRITICAL:** every entity schema's `hospital_id` field was writable (no `readOnly`),
  contradicting ADR-002/007's design that `hospitalId` comes only from the verified JWT
  session, never client input. Fixed: renamed to `hospitalId` (camelCase, matching every
  other field) and marked `readOnly: true` in all 30 affected schemas, plus added it to
  `EyeReading` which had been missed entirely.
- Server URL corrected — `https://{projectRef}.functions.supabase.co/v1` matched neither
  of Supabase's actual Edge Function invocation URL patterns. Now
  `https://{projectRef}.supabase.co/functions/v1`, documented as Supabase's own platform
  prefix, not a project API version.
- `/insurance/companies/all` (a path segment for "no pagination") merged into
  `GET /insurance/companies?paginated=false` — filtering by quantity is a query parameter,
  not a separate resource path.
- Exotel webhook operation description now documents the actual token mechanism found in
  `src/app/api/exotel/webhook/route.ts` (`X-Exotel-Token` header or `token` query param,
  compared against `EXOTEL_WEBHOOK_TOKEN`) and flags the H-2 fail-open bug that must be
  fixed (not carried forward) when this endpoint is implemented as an Edge Function.
- Added tag-level descriptions documenting explicit scope deferrals: Doctor entity
  CRUD (doctors are User records with role=DOCTOR, managed via `/staff/members`, not a
  separate `doctor` endpoint), lab result recording, and PDF report generation are not yet
  designed — noted as deferred, not silently missing.

**A second, independent audit (done directly against `src/lib/permissions.ts`, not just
the architect-agent's stylistic review) found a more serious problem**: many `x-permission`
values in the generated spec did not match the real permission keys already defined in
code — they were plausible-sounding invented names, not the actual 30-key model ADR-002
said would be reused. Fixed by mapping every value back to its real key:

| Spec had (wrong) | Real key in `permissions.ts` |
|---|---|
| `patient:*` | `patients:*` (plural) |
| `inpatient:*` | `inpatients:*` (plural) |
| `license_tracker:*` | `licenses:*` |
| `doctor:edit`, `doctor:prescribe` | `doctor:consult` (the only real doctor-mutation key) |
| `labs:manage` | `labs:config` |
| `optical:manage` | `optical:edit` |
| `insurance:manage`, `insurance:payment` | `insurance:edit` |
| `expenses:manage` | `expenses:edit` |
| `reports:export` | `data:export` (a distinct, already-existing permission — bulk exports were never part of `reports:view`) |

Three `x-permission` values remain that genuinely do **not** exist in `permissions.ts` today
— `billing:*`, `call_logs:*`, `queue:view` — because billing and queue are new module
boundaries this migration creates, and call-logs currently has no dedicated permission at
all. These are documented inline in the spec's `info.description` as required additions to
`ALL_PERMISSIONS` (and `DEFAULT_ROLE_PERMISSIONS`) during Phase 6/7 — implementation must not
assume they already exist in code.

## 9. OpenAPI Spec Location

Full OpenAPI 3.0.3 spec: `.sde/schemas/openapi.yaml`

Lint status: see lint run output below (file generated by this phase).

---

## 10. References

- `.sde/context.json` — stack, module list, issues
- `.sde/phases/2-architecture.md` — module boundaries, pagination strategy §13.2
- `.sde/phases/4-datamodel.md` — table list, hospital_id migration
- `.sde/adr/ADR-002-authorization-enforcement.md` — RBAC permission model
- `.sde/adr/ADR-005-edge-function-auth-pattern.md` — custom JWT, cookie, refresh rotation
- `.sde/adr/ADR-006-edge-function-internal-routing.md` — Hono basePath pattern
- `.sde/adr/ADR-007-hospital-id-and-rls-enforcement-model.md` — tenant isolation
- `src/app/**/actions.ts` — 229 source functions mapped in §7
