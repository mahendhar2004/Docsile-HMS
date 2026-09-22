# docsile-hms Migration — Running Progress Tracker

**Purpose:** the single place to check "is anything missing" during the
Next.js → React/Edge-Functions migration. Update this file every time a
module's backend or frontend work actually changes state — not just at the
end of a phase. If it's not checked off here, it isn't done, regardless of
what any other doc implies.

This tracker's endpoint lists are sourced from `.sde/phases/5-api-design.md`
§7 (the authoritative design) with permission strings corrected to match
the final `.sde/schemas/openapi.yaml` (see that file's §8.11 for the fix
list) and the real `src/lib/permissions.ts`. If the two ever disagree,
`openapi.yaml` wins — fix this file, not the other way around.

**Legend:**
- ⬜ Not started
- 🔨 In progress
- ✅ Backend done (Edge Function logic ported + matches spec)
- 🎨 Frontend done (page/modal built, uses shared pattern components)
- ✔️ Verified (manually checked against old app's behavior — no holes)
- 🗑️ Old Next.js code for this item deleted from `src/`

A module isn't "done" until every one of its endpoints has ✔️, AND the
corresponding old `src/app/(...)/<module>` code has 🗑️.

---

## Module Status Summary

| # | Module | Endpoints | Backend | Frontend | Verified | Old code removed |
|---|---|---|---|---|---|---|
| 1 | auth | 3 | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | health | 2 | ⬜ | n/a | ⬜ | n/a |
| 3 | patient-care | 28 | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | billing | 5 | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | pharmacy | 21 | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | labs | 14 | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | optical | 16 | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | insurance | 11 | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | queue | 3 | ⬜ | ⬜ | ⬜ | ⬜ |
| 10 | doctor | 11 | ⬜ | ⬜ | ⬜ | ⬜ |
| 11 | staff | 12 | ⬜ | ⬜ | ⬜ | ⬜ |
| 12 | settings | 33 | ⬜ | ⬜ | ⬜ | ⬜ |
| 13 | analytics | 19 | ⬜ | ⬜ | ⬜ | ⬜ |
| 14 | reports | 17 | ⬜ | ⬜ | ⬜ | ⬜ |
| 15 | workup | 4 | ⬜ | ⬜ | ⬜ | ⬜ |
| 16 | expenses | 10 | ⬜ | ⬜ | ⬜ | ⬜ |
| 17 | dues-followups | 8 | ⬜ | ⬜ | ⬜ | ⬜ |
| 18 | call-logs | 8 | ⬜ | ⬜ | ⬜ | ⬜ |
| 19 | license-tracker | 6 | ⬜ | ⬜ | ⬜ | ⬜ |
| 20 | dashboard | 2 | ⬜ | ⬜ | ⬜ | ⬜ |
| | **Total** | **233** | | | | |

Scaffold status (Phase 6, structural skeleton — not counted as "Backend
done"/"Frontend done" above, those mean real logic): see the two entries
in the Session Log below once the running scaffold agents report back.

---

## Known Deferred Items (do not silently drop these)

From `.sde/phases/5-api-design.md` §8 and the OpenAPI spec's tag descriptions:

| Item | Status | Where it's tracked |
|---|---|---|
| Doctor entity CRUD | Deferred by design — doctors are `User` records with role=DOCTOR, managed via `/staff/members`, not a separate endpoint | `doctor` tag description in openapi.yaml |
| Lab result recording endpoint | Deferred — not yet designed; ordering/viewing exists, recording a result does not | `labs` tag description in openapi.yaml |
| PDF report generation/storage endpoint | Deferred — not yet designed; all 17 `reports` endpoints are data queries only | `reports` tag description in openapi.yaml |
| `workup/patients/{id}/start` | Included but marked `deprecated: true` — it's a no-op in the current code (only calls `revalidatePath`) | 5-api-design.md §8.5 |
| 3 new permission keys not yet in code | `billing:*`, `call_logs:*`, `queue:view` must be added to `src/lib/permissions.ts` `ALL_PERMISSIONS` + role defaults before their Edge Functions can enforce anything | openapi.yaml `info.description` |
| Pharmacy bill sequence | Needs its own atomic Postgres sequence (like patient/IP/prescription numbers) — not yet created in the Phase 4 migrations, only 4 sequences exist so far | 5-api-design.md §8.8 — **action item, not yet resolved as of this writing** |
| Financial fields are `DOUBLE PRECISION` not `NUMERIC` | Pre-existing issue, out of scope for the migration itself, flagged for whenever the billing module is touched | 4-datamodel.md open question 5 |
| `StaffAttendance` / `SocialPost` live-DB status uncertain | Needs owner confirmation in the Supabase dashboard | 4-datamodel.md open questions 1-2 |
| Supabase project region (India-DPDP) | Needs owner confirmation in the Supabase dashboard | 2-architecture.md §1.1, 4-datamodel.md open question 3 |

---

## Per-Module Endpoint Checklists

Status column values: ⬜ / 🔨 / ✅ (backend) — add 🎨 and ✔️ inline once
frontend work and verification happen; this file gets edited in place as
work progresses, not appended to.

### auth (3)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | POST | /auth/login | public | `(auth)/login/actions.ts` |
| ⬜ | POST | /auth/refresh | cookie-only | new (ADR-005 refresh rotation) |
| ⬜ | POST | /auth/logout | cookie-only | `api/logout/route.ts` |

### health (2)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /health | public | new |
| ⬜ | GET | /health/db | public | new |

### patient-care (28)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /patient-care/patients | `patients:view` | `getPatients` |
| ⬜ | GET | /patient-care/patients/search | `patients:view` | `searchExistingPatients` |
| ⬜ | GET | /patient-care/patients/next-id | `patients:create` | `getNextPatientId` |
| ⬜ | GET | /patient-care/patients/registration-form | `patients:create` | `getPatientRegistrationFormData` |
| ⬜ | POST | /patient-care/patients | `patients:create` | `createPatient` |
| ⬜ | GET | /patient-care/patients/{id} | `patients:view` | `getPatientById` |
| ⬜ | PATCH | /patient-care/patients/{id} | `patients:edit` | `updatePatientInfo` |
| ⬜ | DELETE | /patient-care/patients/{id} | `patients:delete` | `deletePatient` |
| ⬜ | PATCH | /patient-care/patients/{id}/status | `patients:edit` | `updatePatientStatus` |
| ⬜ | PATCH | /patient-care/patients/{id}/date | `patients:edit` | `movePatientToDate` |
| ⬜ | GET | /patient-care/patients/{id}/last-visit | `patients:view` | `getPatientWithLastVisit` |
| ⬜ | GET | /patient-care/patients/{id}/receipt | `billing:view` (new) | `getPatientReceiptData` |
| ⬜ | POST | /patient-care/patients/{id}/services | `billing:create` (new) | `addServiceToPatient` |
| ⬜ | POST | /patient-care/patients/{id}/prescriptions | `billing:create` (new) | `createPrescriptionWithBilling` |
| ⬜ | GET | /patient-care/inpatients | `inpatients:view` | `getInPatients` |
| ⬜ | GET | /patient-care/inpatients/next-id | `inpatients:create` | `getNextInPatientId` |
| ⬜ | GET | /patient-care/inpatients/admission-form | `inpatients:create` | `getInPatientAdmissionFormData` |
| ⬜ | POST | /patient-care/inpatients | `inpatients:create` | `createInPatient` |
| ⬜ | GET | /patient-care/inpatients/{id} | `inpatients:view` | `getInPatientById` |
| ⬜ | PATCH | /patient-care/inpatients/{id} | `inpatients:edit` | `updateInPatient` |
| ⬜ | PATCH | /patient-care/inpatients/{id}/basic-info | `inpatients:edit` | `updateInPatientBasicInfo` |
| ⬜ | PATCH | /patient-care/inpatients/{id}/details | `inpatients:edit` | `updateInPatientDetails` |
| ⬜ | PATCH | /patient-care/inpatients/{id}/status | `inpatients:edit` | `updateInPatientStatus` |
| ⬜ | POST | /patient-care/inpatients/{id}/payments | `inpatients:edit` | `addInPatientPayment` |
| ⬜ | POST | /patient-care/inpatients/{id}/discharge | `inpatients:discharge` | `dischargeInPatient` |
| ⬜ | DELETE | /patient-care/inpatients/{id} | `inpatients:delete` | `deleteInPatient` |
| ⬜ | GET | /patient-care/dropdown-options | `patients:view` | `getDropdownOptions` |
| ⬜ | POST | /patient-care/dropdown-options | `patients:edit` | `addDropdownOption` |

### billing (5) — new module, permissions not yet in permissions.ts
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /billing/daily | `billing:view` (new) | Aggregates today's Prescription revenue |
| ⬜ | GET | /billing/prescriptions | `billing:view` (new) | List prescriptions with amounts/payments |
| ⬜ | GET | /billing/prescriptions/{id} | `billing:view` (new) | Single prescription + items + payments |
| ⬜ | POST | /billing/prescriptions/{id}/payments | `billing:create` (new) | Record additional payment |
| ⬜ | DELETE | /billing/prescriptions/{id}/payments/{payId} | `billing:delete` (new) | Void a payment (admin only) |

### pharmacy (21)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /pharmacy/medicines | `pharmacy:view` | `getMedicines` |
| ⬜ | POST | /pharmacy/medicines | `pharmacy:manage_stock` | `createMedicine` |
| ⬜ | PATCH | /pharmacy/medicines/{id} | `pharmacy:manage_stock` | `updateMedicine` |
| ⬜ | DELETE | /pharmacy/medicines/{id} | `pharmacy:manage_stock` | `deleteMedicine` (soft) |
| ⬜ | GET | /pharmacy/stock | `pharmacy:view` | `getStock` |
| ⬜ | POST | /pharmacy/stock | `pharmacy:manage_stock` | `addStock` |
| ⬜ | PATCH | /pharmacy/stock/{id} | `pharmacy:manage_stock` | `updateStock` |
| ⬜ | GET | /pharmacy/stock/summary | `pharmacy:view` | `getStockSummary` |
| ⬜ | GET | /pharmacy/stock/search | `pharmacy:view` | `searchMedicineStock` |
| ⬜ | GET | /pharmacy/suppliers | `pharmacy:view` | `getSuppliers` |
| ⬜ | POST | /pharmacy/suppliers | `pharmacy:manage_stock` | `createSupplier` |
| ⬜ | PATCH | /pharmacy/suppliers/{id} | `pharmacy:manage_stock` | `updateSupplier` |
| ⬜ | DELETE | /pharmacy/suppliers/{id} | `pharmacy:manage_stock` | `deleteSupplier` (soft) |
| ⬜ | GET | /pharmacy/purchase-orders | `pharmacy:purchase_orders` | `getPurchaseOrders` |
| ⬜ | POST | /pharmacy/purchase-orders | `pharmacy:purchase_orders` | `createPurchaseOrder` |
| ⬜ | POST | /pharmacy/purchase-orders/{id}/receive | `pharmacy:purchase_orders` | `receivePurchaseOrder` |
| ⬜ | PATCH | /pharmacy/purchase-orders/{id}/status | `pharmacy:purchase_orders` | `updatePOStatus` |
| ⬜ | GET | /pharmacy/bills | `pharmacy:view` | `getPharmacyBills` |
| ⬜ | POST | /pharmacy/bills | `pharmacy:create` | `createPharmacyBill` — **needs new atomic sequence, see deferred items** |
| ⬜ | GET | /pharmacy/pending-medicines | `pharmacy:view` | `getPendingMedicines` |
| ⬜ | GET | /pharmacy/patients/{patientId}/prescription | `pharmacy:view` | `getPatientPrescription` |

### labs (14)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /labs/labs | `labs:view` | `getLabs` |
| ⬜ | POST | /labs/labs | `labs:config` | `createLab` |
| ⬜ | GET | /labs/labs/{id} | `labs:view` | `getLabById` |
| ⬜ | PATCH | /labs/labs/{id} | `labs:config` | `updateLab` |
| ⬜ | DELETE | /labs/labs/{id} | `labs:config` | `deleteLab` (soft) |
| ⬜ | GET | /labs/labs/{labId}/investigations | `labs:view` | `getLabInvestigations` |
| ⬜ | GET | /labs/investigations | `labs:view` | `getAllInvestigations` |
| ⬜ | POST | /labs/investigations | `labs:config` | `createInvestigation` |
| ⬜ | PUT | /labs/labs/{labId}/investigations | `labs:config` | `updateLabInvestigations` (replace-all) |
| ⬜ | GET | /labs/patients/{patientId}/investigations | `labs:view` | `getPatientInvestigations` |
| ⬜ | GET | /labs/pending-investigations | `labs:view` | `getPendingLabInvestigations` |
| ⬜ | GET | /labs/bills | `labs:view` | `getLabBills` |
| ⬜ | POST | /labs/bills | `labs:create` | `createLabBills` (multi-bill) |
| ⬜ | GET | /labs/bills/{id} | `labs:view` | `getLabBillById` |

*(Lab result recording is explicitly deferred — see Known Deferred Items.)*

### optical (16)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /optical/products | `optical:view` | `getOpticalProducts` |
| ⬜ | POST | /optical/products | `optical:edit` | `createOpticalProduct` |
| ⬜ | PATCH | /optical/products/{id} | `optical:edit` | `updateOpticalProduct` |
| ⬜ | DELETE | /optical/products/{id} | `optical:edit` | `deleteOpticalProduct` (soft) |
| ⬜ | GET | /optical/stock | `optical:view` | `getOpticalStock` |
| ⬜ | POST | /optical/stock | `optical:edit` | `addOpticalStock` (upsert) |
| ⬜ | PATCH | /optical/stock/{id} | `optical:edit` | `updateOpticalStock` |
| ⬜ | GET | /optical/stock/summary | `optical:view` | `getStockSummary` |
| ⬜ | GET | /optical/stock/search | `optical:view` | `searchOpticalStock` |
| ⬜ | GET | /optical/bills | `optical:view` | `getOpticalBills` |
| ⬜ | POST | /optical/bills | `optical:create` | `createOpticalBill` |
| ⬜ | PATCH | /optical/bills/{id}/status | `optical:edit` | `updateOpticalBillStatus` |
| ⬜ | GET | /optical/patients/{patientId}/ar-reading | `optical:view` | `getPatientWithARReading` |
| ⬜ | GET | /optical/settings | `settings:view` | `getOpticalSettings` |
| ⬜ | PATCH | /optical/settings | `settings:edit` | `updateOpticalSettings` |
| ⬜ | GET | /optical/hospital-profile | `optical:view` | `getOpticalHospitalProfile` |

### insurance (11)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /insurance/companies | `insurance:view` | `getInsuranceCompanies` (+ `?paginated=false` for all, merged from old `/all`) |
| ⬜ | POST | /insurance/companies | `insurance:edit` | `createInsuranceCompany` |
| ⬜ | PATCH | /insurance/companies/{id} | `insurance:edit` | `updateInsuranceCompany` |
| ⬜ | DELETE | /insurance/companies/{id} | `insurance:edit` | `deleteInsuranceCompany` (soft) |
| ⬜ | GET | /insurance/claims | `insurance:view` | `getInsuranceClaims` |
| ⬜ | POST | /insurance/claims | `insurance:create` | `createInsuranceClaim` |
| ⬜ | GET | /insurance/claims/{id} | `insurance:view` | `getInsuranceClaimById` |
| ⬜ | PATCH | /insurance/claims/{id}/status | `insurance:edit` | `updateInsuranceClaimStatus` |
| ⬜ | PATCH | /insurance/claims/{id}/details | `insurance:edit` | `updateInsuranceClaimDetails` |
| ⬜ | POST | /insurance/claims/{id}/payments | `insurance:edit` | `addInsurancePatientPayment` |
| ⬜ | GET | /insurance/inpatients/search | `insurance:view` | `searchInPatientsForInsurance` |

*(11 rows — the old `/companies/all` endpoint was merged into the first row, not dropped; see openapi.yaml.)*

### queue (3) — new module, permission not yet in permissions.ts
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /queue/opd | `queue:view` (new) | `getDoctorQueue` (doctor/actions.ts) |
| ⬜ | GET | /queue/workup | `queue:view` (new) | `getWorkupQueue` (workup/actions.ts) |
| ⬜ | GET | /queue/inpatients | `queue:view` (new) | Reads InPatient table for bed/status board |

### doctor (11)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /doctor/queue | `doctor:view` | `getDoctorQueue` |
| ⬜ | GET | /doctor/patients/{patientId}/consultation | `doctor:view` | `getPatientForConsultation` |
| ⬜ | POST | /doctor/patients/{patientId}/prescriptions | `doctor:consult` | `savePrescription` (upsert) |
| ⬜ | GET | /doctor/reference-data | `doctor:view` | `getPrescriptionReferenceData` |
| ⬜ | GET | /doctor/medicine-master | `doctor:view` | `getMedicineMaster` |
| ⬜ | GET | /doctor/investigation-master | `doctor:view` | `getInvestigationMaster` |
| ⬜ | GET | /doctor/prescription-templates | `doctor:view` | `getPredefinedTemplates` |
| ⬜ | GET | /doctor/dropdown-options | `doctor:view` | `getDropdownOptions` |
| ⬜ | POST | /doctor/dropdown-options | `doctor:consult` | `addDropdownOption` |
| ⬜ | POST | /doctor/medicines | `doctor:consult` | `createMedicine` |
| ⬜ | GET | /doctor/patients/{patientId}/receipt | `billing:view` (new) | `getReceiptData` |

*(No separate Doctor-entity CRUD here — deferred by design, see Known Deferred Items.)*

### staff (12)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /staff/members | `staff:view` | `getStaffMembers` |
| ⬜ | POST | /staff/members | `staff:create` | `createStaffMember` |
| ⬜ | GET | /staff/members/{id} | `staff:view` | `getStaffMember` |
| ⬜ | PATCH | /staff/members/{id} | `staff:edit` | `updateStaffMember` |
| ⬜ | PATCH | /staff/members/{id}/active | `staff:deactivate` | `toggleStaffActive` |
| ⬜ | POST | /staff/members/{id}/reset-password | `staff:edit` | `resetStaffPassword` |
| ⬜ | GET | /staff/roles | `staff:view` | `getRoles` |
| ⬜ | POST | /staff/roles | `staff:manage_roles` | `createRole` |
| ⬜ | PATCH | /staff/roles/{id} | `staff:manage_roles` | `updateRole` |
| ⬜ | PATCH | /staff/roles/{id}/permissions | `staff:manage_roles` | `updateRolePermissions` |
| ⬜ | DELETE | /staff/roles/{id} | `staff:manage_roles` | `deleteRole` |
| ⬜ | POST | /staff/roles/seed | `staff:manage_roles` | `seedSystemRoles` |

### settings (33)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /settings/service-templates | `settings:view` | `getServiceTemplates` |
| ⬜ | POST | /settings/service-templates | `settings:edit` | `createServiceTemplate` |
| ⬜ | PATCH | /settings/service-templates/{id} | `settings:edit` | `updateServiceTemplate` |
| ⬜ | DELETE | /settings/service-templates/{id} | `settings:edit` | `deleteServiceTemplate` |
| ⬜ | GET | /settings/hospital-profile | `settings:view` | `getHospitalProfile` |
| ⬜ | PATCH | /settings/hospital-profile | `settings:edit` | `updateHospitalProfile` |
| ⬜ | GET | /settings/print-config | `settings:view` | `getDefaultPrintConfig` |
| ⬜ | PATCH | /settings/print-config | `settings:edit` | `saveDefaultPrintConfig` |
| ⬜ | PATCH | /settings/nav-style | `settings:edit` | `updateNavStyle` |
| ⬜ | GET | /settings/prescription-templates | `settings:view` | `getPrescriptionTemplates` |
| ⬜ | POST | /settings/prescription-templates | `settings:edit` | `createPrescriptionTemplate` |
| ⬜ | PATCH | /settings/prescription-templates/{id} | `settings:edit` | `updatePrescriptionTemplate` |
| ⬜ | DELETE | /settings/prescription-templates/{id} | `settings:edit` | `deletePrescriptionTemplate` |
| ⬜ | GET | /settings/inpatient-templates | `settings:view` | `getInpatientTemplates` |
| ⬜ | POST | /settings/inpatient-templates | `settings:edit` | `createInpatientTemplate` |
| ⬜ | PATCH | /settings/inpatient-templates/{id} | `settings:edit` | `updateInpatientTemplate` |
| ⬜ | DELETE | /settings/inpatient-templates/{id} | `settings:edit` | `deleteInpatientTemplate` |
| ⬜ | GET | /settings/packages | `settings:view` | `getPredefinedPackages` |
| ⬜ | POST | /settings/packages | `settings:edit` | `createPredefinedPackage` |
| ⬜ | PATCH | /settings/packages/{id} | `settings:edit` | `updatePredefinedPackage` |
| ⬜ | DELETE | /settings/packages/{id} | `settings:edit` | `deletePredefinedPackage` |
| ⬜ | GET | /settings/surgeries | `settings:view` | `getPredefinedSurgeries` |
| ⬜ | POST | /settings/surgeries | `settings:edit` | `createPredefinedSurgery` |
| ⬜ | PATCH | /settings/surgeries/{id} | `settings:edit` | `updatePredefinedSurgery` |
| ⬜ | DELETE | /settings/surgeries/{id} | `settings:edit` | `deletePredefinedSurgery` (soft) |
| ⬜ | GET | /settings/discharges | `settings:view` | `getPredefinedDischarges` |
| ⬜ | POST | /settings/discharges | `settings:edit` | `createPredefinedDischarge` |
| ⬜ | PATCH | /settings/discharges/{id} | `settings:edit` | `updatePredefinedDischarge` |
| ⬜ | DELETE | /settings/discharges/{id} | `settings:edit` | `deletePredefinedDischarge` (soft) |
| ⬜ | GET | /settings/medicine-master | `settings:view` | `getMedicineMasterList` |
| ⬜ | POST | /settings/medicine-master | `settings:edit` | `createMedicineMaster` |
| ⬜ | PATCH | /settings/medicine-master/{id} | `settings:edit` | `updateMedicineMaster` |
| ⬜ | DELETE | /settings/medicine-master/{id} | `settings:edit` | `deleteMedicineMaster` |

### analytics (19) — all share `?filter=today|week|month|year|custom&customStart&customEnd`
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /analytics/overview | `reports:view` | `getAnalyticsOverview` |
| ⬜ | GET | /analytics/gender-distribution | `reports:view` | `getGenderDistribution` |
| ⬜ | GET | /analytics/age-distribution | `reports:view` | `getAgeDistribution` |
| ⬜ | GET | /analytics/revenue-by-category | `reports:view` | `getRevenueByCategory` |
| ⬜ | GET | /analytics/time-series | `reports:view` | `getTimeSeries` |
| ⬜ | GET | /analytics/top-services | `reports:view` | `getTopServices` |
| ⬜ | GET | /analytics/expense-breakdown | `reports:view` | `getExpenseBreakdown` |
| ⬜ | GET | /analytics/financial-summary | `reports:view` | `getFinancialSummary` |
| ⬜ | GET | /analytics/payment-mode-breakdown | `reports:view` | `getPaymentModeBreakdown` |
| ⬜ | GET | /analytics/doctor-performance | `reports:view` | `getDoctorPerformance` |
| ⬜ | GET | /analytics/status-distribution | `reports:view` | `getStatusDistribution` |
| ⬜ | GET | /analytics/common-diagnoses | `reports:view` | `getCommonDiagnoses` |
| ⬜ | GET | /analytics/common-medicines | `reports:view` | `getCommonMedicines` |
| ⬜ | GET | /analytics/top-prescribed-investigations | `reports:view` | `getTopPrescribedInvestigations` |
| ⬜ | GET | /analytics/top-pharmacy-sales | `reports:view` | `getTopPharmacySales` |
| ⬜ | GET | /analytics/top-lab-tests | `reports:view` | `getTopLabTests` |
| ⬜ | GET | /analytics/referral-stats | `reports:view` | `getReferralStats` |
| ⬜ | GET | /analytics/surgery-breakdown | `reports:view` | `getSurgeryBreakdown` |
| ⬜ | GET | /analytics/region-stats | `reports:view` | `getRegionStats` |

### reports (17)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /reports/patients/search | `reports:view` | `searchPatients` (reports) |
| ⬜ | GET | /reports/patients/{patientId}/summary | `reports:view` | `getPatientSummary` |
| ⬜ | GET | /reports/patients/{patientId}/visits | `reports:view` | `getVisitHistory` |
| ⬜ | GET | /reports/patients/{patientId}/prescriptions | `reports:view` | `getPrescriptions` |
| ⬜ | GET | /reports/patients/{patientId}/inpatient | `reports:view` | `getInpatientRecords` |
| ⬜ | GET | /reports/patients/{patientId}/receipt | `reports:view` | `getReportReceiptData` |
| ⬜ | GET | /reports/patients/{patientId}/labs | `reports:view` | `getLabRecords` |
| ⬜ | GET | /reports/patients/{patientId}/billing | `reports:view` | `getBillingOverview` |
| ⬜ | GET | /reports/exports/patients | `data:export` | `getExportPatients` (data) |
| ⬜ | GET | /reports/exports/prescriptions | `data:export` | `getExportPrescriptions` |
| ⬜ | GET | /reports/exports/eye-readings | `data:export` | `getExportEyeReadings` |
| ⬜ | GET | /reports/exports/inpatients | `data:export` | `getExportInPatients` |
| ⬜ | GET | /reports/exports/insurance-claims | `data:export` | `getExportInsuranceClaims` |
| ⬜ | GET | /reports/exports/lab-bills | `data:export` | `getExportLabBills` |
| ⬜ | GET | /reports/exports/pharmacy-bills | `data:export` | `getExportPharmacyBills` |
| ⬜ | GET | /reports/exports/optical-bills | `data:export` | `getExportOpticalBills` |
| ⬜ | GET | /reports/exports/expenses | `data:export` | `getExportExpenses` |

*(PDF generation/storage is explicitly deferred — see Known Deferred Items.)*

### workup (4)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /workup/queue | `workup:view` | `getWorkupQueue` |
| ⬜ | GET | /workup/patients/{patientId} | `workup:view` | `getPatientForWorkup` |
| ⬜ | POST | /workup/patients/{patientId}/eye-readings | `workup:create` | `saveEyeReading` (upsert) |
| ⬜ | POST | /workup/patients/{patientId}/start | `workup:create` | `startWorkup` — **no-op, deprecated, keep for compat only** |

### expenses (10)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | POST | /expenses/categories/seed | `expenses:edit` | `seedDefaultCategories` |
| ⬜ | GET | /expenses/categories | `expenses:view` | `getCategories` |
| ⬜ | POST | /expenses/categories | `expenses:edit` | `createCategory` |
| ⬜ | PATCH | /expenses/categories/{id} | `expenses:edit` | `updateCategory` |
| ⬜ | DELETE | /expenses/categories/{id} | `expenses:edit` | `deleteCategory` |
| ⬜ | PATCH | /expenses/categories/reorder | `expenses:edit` | `reorderCategories` (bulk) |
| ⬜ | GET | /expenses | `expenses:view` | `getExpensesByDateRange` |
| ⬜ | POST | /expenses | `expenses:create` | `createExpense` |
| ⬜ | PATCH | /expenses/{id} | `expenses:edit` | `updateExpense` |
| ⬜ | DELETE | /expenses/{id} | `expenses:delete` | `deleteExpense` |

### dues-followups (8)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /dues-followups/dues | `dues:view` | `getDues` (crosses Prescription/InPatient/LabBill/PharmacyBill) |
| ⬜ | GET | /dues-followups/followups | `dues:view` | `getFollowUps` |
| ⬜ | PATCH | /dues-followups/dues/{id}/mark-paid | `dues:edit` | `markDueAsPaid` |
| ⬜ | GET | /dues-followups/doctors | `dues:view` | `getDoctorList` |
| ⬜ | GET | /dues-followups/departments | `dues:view` | `getDepartmentList` |
| ⬜ | GET | /dues-followups/email-templates | `dues:view` | `getAvailableTemplates` |
| ⬜ | GET | /dues-followups/hospital-name | `dues:view` | `getHospitalDisplayName` |
| ⬜ | POST | /dues-followups/send-email | `dues:edit` | `sendPatientEmail` |

### call-logs (8) — new module, permission not yet in permissions.ts
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /call-logs/analytics | `call_logs:view` (new) | `getCallAnalytics` |
| ⬜ | GET | /call-logs | `call_logs:view` (new) | `getCallLogs` |
| ⬜ | GET | /call-logs/stats | `call_logs:view` (new) | `getCallStats` |
| ⬜ | PATCH | /call-logs/{id}/notes | `call_logs:edit` (new) | `updateCallNotes` |
| ⬜ | PATCH | /call-logs/{id}/patient | `call_logs:edit` (new) | `linkCallToPatient` |
| ⬜ | GET | /call-logs/patients/search | `call_logs:view` (new) | `searchPatients` |
| ⬜ | POST | /call-logs/sync | `call_logs:sync` (new) | `syncExotelCalls` |
| ⬜ | POST | /call-logs/webhook/exotel | `token-only` (no JWT, see openapi.yaml description) | `api/exotel/webhook/route.ts` — **fix H-2 fail-open bug during porting, do not carry it forward** |

### license-tracker (6)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /license-tracker | `licenses:view` | `getLicenses` |
| ⬜ | POST | /license-tracker | `licenses:create` | `createLicense` |
| ⬜ | PATCH | /license-tracker/{id} | `licenses:edit` | `updateLicense` |
| ⬜ | DELETE | /license-tracker/{id} | `licenses:delete` | `deleteLicense` |
| ⬜ | PATCH | /license-tracker/{id}/document | `licenses:edit` | `saveLicenseDocumentUrl` |
| ⬜ | DELETE | /license-tracker/{id}/document | `licenses:edit` | `removeLicenseDocument` |

### dashboard (2)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /dashboard/summary | `reports:view` | Aggregates today's patient + revenue stats |
| ⬜ | GET | /dashboard/quick-stats | `reports:view` | YTD/MTD totals, active inpatient count |

---

## Session Log

Dated, terse entries — what changed, not a re-explanation of design already
captured in the phase docs.

- **2026-09-21** — Phases 0-5 complete (analysis, idea/PRD+NFRs, architecture
  + ADR-001..006, stack decision + ADR-007, API design). All committed to
  `feat/react-migration` (never `main`), authored as `mahendhar2004`. See
  `.sde/phases/0-analysis.md` through `5-api-design.md` and `.sde/adr/` for
  full detail — this tracker starts recording from Phase 6 onward.
- **2026-09-22** — Phase 6 (scaffold) kicked off: backend Edge Function
  skeletons (18 modules + auth/health, route tables wired to openapi.yaml,
  stub service functions) and frontend Vite/React skeleton (`web/`, Tier 1
  primitives ported, Tier 2 pattern library built for real, routing for all
  18 modules with placeholder pages) — both running in parallel, neither
  touching `src/`. This tracker created in response to the project owner
  asking for a running record so nothing gets missed across 233 endpoints.
- **2026-09-22** — Phase 6 scaffold complete on both surfaces, independently
  verified (not just trusted from the agent reports):
  - Frontend (`web/`): 19 routes confirmed matching the 18-module list
    exactly by reading router.tsx directly; `npm run build` and
    `npm run test` re-run manually — both pass. Tier 1 primitives (24
    ported as-is + 1 adapted) and Tier 2 pattern library (real
    implementations, 60-330 lines each, not stubs) confirmed on disk.
    Committed.
  - Backend (`supabase/functions/`): route counts cross-checked
    programmatically per module against `openapi.yaml` — all 20 modules
    match exactly, 233=233, 0 mismatches. `_shared/auth.ts` confirmed:
    no hardcoded AUTH_SECRET fallback (throws if missing), jti checked
    against `token_revocation` (H-1). `call-logs/index.ts` confirmed:
    exotel webhook now fails closed (401) if `EXOTEL_WEBHOOK_TOKEN` is
    unset, fixing H-2's original fail-open bug. Static routes (e.g.
    `/patients/search`) confirmed registered before dynamic ones
    (`/patients/:id`) where needed. **Not verified**: `deno check` could
    not be run (Deno not installed in this environment) — must run
    before first deployment, per the scaffold's own handoff notes.
  - This is scaffold/skeleton only — every service.ts function still
    throws `NotImplementedError`. The Module Status Summary table above
    stays ⬜ until Phase 7 replaces stubs with real logic module by
    module; scaffold completion is tracked here in prose, not by
    flipping those checkboxes early.
  - Phase 7 handoff notes from the backend scaffold (not yet done):
    finalize `auth/repository.ts`'s logout token_revocation insert
    (currently a stub even though the read-side jti check is real),
    and register the 3 new permission keys (`billing:*`, `call_logs:*`,
    `queue:view`) in `src/lib/permissions.ts` — already flagged in
    Known Deferred Items above, repeating here since it's now blocking
    Phase 7 start, not just a future concern.
