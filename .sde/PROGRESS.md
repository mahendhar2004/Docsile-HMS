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
| 1 | auth | 3 | ✅ | ⬜ | ⬜ | ⬜ |
| 2 | health | 2 | ⬜ | n/a | ⬜ | n/a |
| 3 | patient-care | 28 | ✅ | ⬜ | ⬜ | ⬜ |
| 4 | billing | 5 | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | pharmacy | 21 | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | labs | 14 | ⬜ | ⬜ | ⬜ | ⬜ |
| 7 | optical | 16 | ⬜ | ⬜ | ⬜ | ⬜ |
| 8 | insurance | 11 | ⬜ | ⬜ | ⬜ | ⬜ |
| 9 | queue | 3 | ✅ | ⬜ | ⬜ | ⬜ |
| 10 | doctor | 12 | ✅ | ⬜ | ⬜ | ⬜ |
| 11 | staff | 12 | ✅ | ⬜ | ⬜ | ⬜ |
| 12 | settings | 33 | ✅ | ⬜ | ⬜ | ⬜ |
| 13 | analytics | 19 | ✅ | ⬜ | ⬜ | ⬜ |
| 14 | reports | 17 | ⬜ | ⬜ | ⬜ | ⬜ |
| 15 | workup | 4 | ⬜ | ⬜ | ⬜ | ⬜ |
| 16 | expenses | 10 | ⬜ | ⬜ | ⬜ | ⬜ |
| 17 | dues-followups | 8 | ⬜ | ⬜ | ⬜ | ⬜ |
| 18 | call-logs | 8 | ✅ | ⬜ | ⬜ | ⬜ |
| 19 | license-tracker | 6 | ✅ | ⬜ | ⬜ | ⬜ |
| 20 | dashboard | 2 | ⬜ | ⬜ | ⬜ | ⬜ |
| | **Total** | **234** | | | | |

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
| Exotel webhook hospitalId resolution is single-tenant only | `POST /call-logs/webhook/exotel` falls back to a single-row `HospitalProfile` lookup when Exotel's request carries no `X-Hospital-Id` header — correct for the current one-hospital deployment, but will misattribute calls (or need to error) once a second hospital tenant is onboarded. Needs real per-hospital webhook routing (e.g. a hospital-specific webhook URL/token, or requiring the header) before that happens. | `call-logs` module implementation notes, 2026-09-22 |
| **"Ask Sitha AI" — RESOLVED: owner confirmed it's required, added to spec** | `src/app/(hospital)/doctor/ai-actions.ts` (968 lines, `askSithaAI`) is a Gemini-backed AI consultation assistant. Phase 5's API design never accounted for it — this was a real gap, not a deliberate deferral. **Owner decision (2026-09-22): port it.** Added as `POST /doctor/ai/ask` in openapi.yaml (doctor tag, 12th endpoint, `doctor:consult` permission matching the old code exactly). Gemini calls stay server-side (Edge Function) — the API key must never reach the browser; this also fixes M-5 (old code passed the Gemini key as a URL query param, must move to an Authorization header when ported). Implementation (porting `buildPatientContext`/`buildAnalyticsContext`/`resolvePatientContext` + the Gemini call wrapper into the doctor Edge Function) is in progress — see doctor module status (🔨, not yet ✅ — the module's other 11 endpoints are done, this 12th is not). | Design added 2026-09-22; implementation tracked in doctor module row above |
| Staff profile fields were write-path-only missing (fixed) | The `staff` module's Phase 7 implementation initially only accepted `{name, email, password, role, employeeId}` on create/update, silently dropping `phone/department/designation/qualifications/joiningDate/address/emergencyContact/bloodGroup/salary/salaryType` even though all 10 are real `User` columns already returned correctly on reads. Caught and fixed before commit (openapi.yaml `User` schema + create/update request bodies, types.ts, service.ts, repository.ts all widened). Also fixed: password minimum length had drifted to 8 chars (a generic default) instead of the old app's actual 6-char minimum. | `staff` module implementation notes, 2026-09-22 — **fixed, not just flagged** |
| **Realtime broadcast doesn't do column-level PII filtering — RESOLVED, owner accepts as-is** | ADR-003 said "Realtime channels broadcast only non-PII status fields," but standard Supabase `postgres_changes` (used by the queue module's `ALTER PUBLICATION` migration) broadcasts full rows, filtered only by RLS (who can see the row), not by which columns are included. **Owner decision (2026-09-22): fine with the current approach.** Since only authenticated hospital staff who already have full read access can subscribe to their own hospital's channel, full-row-broadcast-scoped-by-RLS is accepted as sufficient — no trigger-based column-filtered broadcast work planned. ADR-003 should be updated to reflect this if it's revisited later, but no code change needed now. | Found during `queue` module Phase 7 implementation, 2026-09-22 — resolved same day |

---

## Per-Module Endpoint Checklists

Status column values: ⬜ / 🔨 / ✅ (backend) — add 🎨 and ✔️ inline once
frontend work and verification happen; this file gets edited in place as
work progresses, not appended to.

### auth (3)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | POST | /auth/login | public | `(auth)/login/actions.ts` |
| ✅ | POST | /auth/refresh | cookie-only | new (ADR-005 refresh rotation) |
| ✅ | POST | /auth/logout | cookie-only | `api/logout/route.ts` |

### health (2)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ⬜ | GET | /health | public | new |
| ⬜ | GET | /health/db | public | new |

### patient-care (28)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /patient-care/patients | `patients:view` | `getPatients` |
| ✅ | GET | /patient-care/patients/search | `patients:view` | `searchExistingPatients` |
| ✅ | GET | /patient-care/patients/next-id | `patients:create` | `getNextPatientId` |
| ✅ | GET | /patient-care/patients/registration-form | `patients:create` | `getPatientRegistrationFormData` |
| ✅ | POST | /patient-care/patients | `patients:create` | `createPatient` |
| ✅ | GET | /patient-care/patients/{id} | `patients:view` | `getPatientById` |
| ✅ | PATCH | /patient-care/patients/{id} | `patients:edit` | `updatePatientInfo` |
| ✅ | DELETE | /patient-care/patients/{id} | `patients:delete` | `deletePatient` |
| ✅ | PATCH | /patient-care/patients/{id}/status | `patients:edit` | `updatePatientStatus` |
| ✅ | PATCH | /patient-care/patients/{id}/date | `patients:edit` | `movePatientToDate` |
| ✅ | GET | /patient-care/patients/{id}/last-visit | `patients:view` | `getPatientWithLastVisit` |
| ✅ | GET | /patient-care/patients/{id}/receipt | `billing:view` (new) | `getPatientReceiptData` |
| ✅ | POST | /patient-care/patients/{id}/services | `billing:create` (new) | `addServiceToPatient` |
| ✅ | POST | /patient-care/patients/{id}/prescriptions | `billing:create` (new) | `createPrescriptionWithBilling` |
| ✅ | GET | /patient-care/inpatients | `inpatients:view` | `getInPatients` |
| ✅ | GET | /patient-care/inpatients/next-id | `inpatients:create` | `getNextInPatientId` |
| ✅ | GET | /patient-care/inpatients/admission-form | `inpatients:create` | `getInPatientAdmissionFormData` |
| ✅ | POST | /patient-care/inpatients | `inpatients:create` | `createInPatient` |
| ✅ | GET | /patient-care/inpatients/{id} | `inpatients:view` | `getInPatientById` |
| ✅ | PATCH | /patient-care/inpatients/{id} | `inpatients:edit` | `updateInPatient` |
| ✅ | PATCH | /patient-care/inpatients/{id}/basic-info | `inpatients:edit` | `updateInPatientBasicInfo` |
| ✅ | PATCH | /patient-care/inpatients/{id}/details | `inpatients:edit` | `updateInPatientDetails` |
| ✅ | PATCH | /patient-care/inpatients/{id}/status | `inpatients:edit` | `updateInPatientStatus` |
| ✅ | POST | /patient-care/inpatients/{id}/payments | `inpatients:edit` | `addInPatientPayment` |
| ✅ | POST | /patient-care/inpatients/{id}/discharge | `inpatients:discharge` | `dischargeInPatient` |
| ✅ | DELETE | /patient-care/inpatients/{id} | `inpatients:delete` | `deleteInPatient` |
| ✅ | GET | /patient-care/dropdown-options | `patients:view` | `getDropdownOptions` |
| ✅ | POST | /patient-care/dropdown-options | `patients:edit` | `addDropdownOption` |

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
| ✅ | GET | /queue/opd | `queue:view` (new) | `getDoctorQueue` (doctor/actions.ts) |
| ✅ | GET | /queue/workup | `queue:view` (new) | `getWorkupQueue` (workup/actions.ts) |
| ✅ | GET | /queue/inpatients | `queue:view` (new) | Reads InPatient table for bed/status board |

### doctor (12)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /doctor/queue | `doctor:view` | `getDoctorQueue` |
| ✅ | GET | /doctor/patients/{patientId}/consultation | `doctor:view` | `getPatientForConsultation` |
| ✅ | POST | /doctor/patients/{patientId}/prescriptions | `doctor:consult` | `savePrescription` (upsert) |
| ✅ | GET | /doctor/reference-data | `doctor:view` | `getPrescriptionReferenceData` |
| ✅ | GET | /doctor/medicine-master | `doctor:view` | `getMedicineMaster` |
| ✅ | GET | /doctor/investigation-master | `doctor:view` | `getInvestigationMaster` |
| ✅ | GET | /doctor/prescription-templates | `doctor:view` | `getPredefinedTemplates` |
| ✅ | GET | /doctor/dropdown-options | `doctor:view` | `getDropdownOptions` |
| ✅ | POST | /doctor/dropdown-options | `doctor:consult` | `addDropdownOption` |
| ✅ | POST | /doctor/medicines | `doctor:consult` | `createMedicine` |
| ✅ | GET | /doctor/patients/{patientId}/receipt | `billing:view` | `getReceiptData` |
| ✅ | POST | /doctor/ai/ask | `doctor:consult` | `askSithaAI` (`ai-actions.ts`) — added post-Phase-5 per owner decision 2026-09-22, see Known Deferred Items; M-5 fixed (key now sent as `x-goog-api-key` header, never in URL) |

*(No separate Doctor-entity CRUD here — deferred by design, see Known Deferred Items.)*

### staff (12)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /staff/members | `staff:view` | `getStaffMembers` |
| ✅ | POST | /staff/members | `staff:create` | `createStaffMember` |
| ✅ | GET | /staff/members/{id} | `staff:view` | `getStaffMember` |
| ✅ | PATCH | /staff/members/{id} | `staff:edit` | `updateStaffMember` |
| ✅ | PATCH | /staff/members/{id}/active | `staff:deactivate` | `toggleStaffActive` |
| ✅ | POST | /staff/members/{id}/reset-password | `staff:edit` | `resetStaffPassword` |
| ✅ | GET | /staff/roles | `staff:view` | `getRoles` |
| ✅ | POST | /staff/roles | `staff:manage_roles` | `createRole` |
| ✅ | PATCH | /staff/roles/{id} | `staff:manage_roles` | `updateRole` |
| ✅ | PATCH | /staff/roles/{id}/permissions | `staff:manage_roles` | `updateRolePermissions` |
| ✅ | DELETE | /staff/roles/{id} | `staff:manage_roles` | `deleteRole` |
| ✅ | POST | /staff/roles/seed | `staff:manage_roles` | `seedSystemRoles` |

### settings (33)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /settings/service-templates | `settings:view` | `getServiceTemplates` |
| ✅ | POST | /settings/service-templates | `settings:edit` | `createServiceTemplate` |
| ✅ | PATCH | /settings/service-templates/{id} | `settings:edit` | `updateServiceTemplate` |
| ✅ | DELETE | /settings/service-templates/{id} | `settings:edit` | `deleteServiceTemplate` |
| ✅ | GET | /settings/hospital-profile | `settings:view` | `getHospitalProfile` |
| ✅ | PATCH | /settings/hospital-profile | `settings:edit` | `updateHospitalProfile` |
| ✅ | GET | /settings/print-config | `settings:view` | `getDefaultPrintConfig` |
| ✅ | PATCH | /settings/print-config | `settings:edit` | `saveDefaultPrintConfig` |
| ✅ | PATCH | /settings/nav-style | `settings:edit` | `updateNavStyle` |
| ✅ | GET | /settings/prescription-templates | `settings:view` | `getPrescriptionTemplates` |
| ✅ | POST | /settings/prescription-templates | `settings:edit` | `createPrescriptionTemplate` |
| ✅ | PATCH | /settings/prescription-templates/{id} | `settings:edit` | `updatePrescriptionTemplate` |
| ✅ | DELETE | /settings/prescription-templates/{id} | `settings:edit` | `deletePrescriptionTemplate` |
| ✅ | GET | /settings/inpatient-templates | `settings:view` | `getInpatientTemplates` |
| ✅ | POST | /settings/inpatient-templates | `settings:edit` | `createInpatientTemplate` |
| ✅ | PATCH | /settings/inpatient-templates/{id} | `settings:edit` | `updateInpatientTemplate` |
| ✅ | DELETE | /settings/inpatient-templates/{id} | `settings:edit` | `deleteInpatientTemplate` |
| ✅ | GET | /settings/packages | `settings:view` | `getPredefinedPackages` |
| ✅ | POST | /settings/packages | `settings:edit` | `createPredefinedPackage` |
| ✅ | PATCH | /settings/packages/{id} | `settings:edit` | `updatePredefinedPackage` |
| ✅ | DELETE | /settings/packages/{id} | `settings:edit` | `deletePredefinedPackage` |
| ✅ | GET | /settings/surgeries | `settings:view` | `getPredefinedSurgeries` |
| ✅ | POST | /settings/surgeries | `settings:edit` | `createPredefinedSurgery` |
| ✅ | PATCH | /settings/surgeries/{id} | `settings:edit` | `updatePredefinedSurgery` |
| ✅ | DELETE | /settings/surgeries/{id} | `settings:edit` | `deletePredefinedSurgery` (soft) |
| ✅ | GET | /settings/discharges | `settings:view` | `getPredefinedDischarges` |
| ✅ | POST | /settings/discharges | `settings:edit` | `createPredefinedDischarge` |
| ✅ | PATCH | /settings/discharges/{id} | `settings:edit` | `updatePredefinedDischarge` |
| ✅ | DELETE | /settings/discharges/{id} | `settings:edit` | `deletePredefinedDischarge` (soft) |
| ✅ | GET | /settings/medicine-master | `settings:view` | `getMedicineMasterList` |
| ✅ | POST | /settings/medicine-master | `settings:edit` | `createMedicineMaster` |
| ✅ | PATCH | /settings/medicine-master/{id} | `settings:edit` | `updateMedicineMaster` |
| ✅ | DELETE | /settings/medicine-master/{id} | `settings:edit` | `deleteMedicineMaster` |

### analytics (19) — all share `?filter=today|week|month|year|custom&customStart&customEnd`
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /analytics/overview | `reports:view` | `getAnalyticsOverview` |
| ✅ | GET | /analytics/gender-distribution | `reports:view` | `getGenderDistribution` |
| ✅ | GET | /analytics/age-distribution | `reports:view` | `getAgeDistribution` |
| ✅ | GET | /analytics/revenue-by-category | `reports:view` | `getRevenueByCategory` |
| ✅ | GET | /analytics/time-series | `reports:view` | `getTimeSeries` |
| ✅ | GET | /analytics/top-services | `reports:view` | `getTopServices` |
| ✅ | GET | /analytics/expense-breakdown | `reports:view` | `getExpenseBreakdown` |
| ✅ | GET | /analytics/financial-summary | `reports:view` | `getFinancialSummary` |
| ✅ | GET | /analytics/payment-mode-breakdown | `reports:view` | `getPaymentModeBreakdown` |
| ✅ | GET | /analytics/doctor-performance | `reports:view` | `getDoctorPerformance` |
| ✅ | GET | /analytics/status-distribution | `reports:view` | `getStatusDistribution` |
| ✅ | GET | /analytics/common-diagnoses | `reports:view` | `getCommonDiagnoses` |
| ✅ | GET | /analytics/common-medicines | `reports:view` | `getCommonMedicines` |
| ✅ | GET | /analytics/top-prescribed-investigations | `reports:view` | `getTopPrescribedInvestigations` |
| ✅ | GET | /analytics/top-pharmacy-sales | `reports:view` | `getTopPharmacySales` |
| ✅ | GET | /analytics/top-lab-tests | `reports:view` | `getTopLabTests` |
| ✅ | GET | /analytics/referral-stats | `reports:view` | `getReferralStats` |
| ✅ | GET | /analytics/surgery-breakdown | `reports:view` | `getSurgeryBreakdown` |
| ✅ | GET | /analytics/region-stats | `reports:view` | `getRegionStats` |

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
| ✅ | GET | /call-logs/analytics | `call_logs:view` (new) | `getCallAnalytics` |
| ✅ | GET | /call-logs | `call_logs:view` (new) | `getCallLogs` |
| ✅ | GET | /call-logs/stats | `call_logs:view` (new) | `getCallStats` |
| ✅ | PATCH | /call-logs/{id}/notes | `call_logs:edit` (new) | `updateCallNotes` |
| ✅ | PATCH | /call-logs/{id}/patient | `call_logs:edit` (new) | `linkCallToPatient` |
| ✅ | GET | /call-logs/patients/search | `call_logs:view` (new) | `searchPatients` |
| ✅ | POST | /call-logs/sync | `call_logs:sync` (new) | `syncExotelCalls` |
| ✅ | POST | /call-logs/webhook/exotel | `token-only` (no JWT, see openapi.yaml description) | `api/exotel/webhook/route.ts` — H-2 fix already in index.ts (Phase 6), webhook body processing now in service.ts |

### license-tracker (6)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /license-tracker | `licenses:view` | `getLicenses` |
| ✅ | POST | /license-tracker | `licenses:create` | `createLicense` |
| ✅ | PATCH | /license-tracker/{id} | `licenses:edit` | `updateLicense` |
| ✅ | DELETE | /license-tracker/{id} | `licenses:delete` | `deleteLicense` |
| ✅ | PATCH | /license-tracker/{id}/document | `licenses:edit` | `saveLicenseDocumentUrl` |
| ✅ | DELETE | /license-tracker/{id}/document | `licenses:edit` | `removeLicenseDocument` |

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
- **2026-09-22** — Phase 7 Wave 1: `auth` module backend complete. `repository.ts`
  implements `findUserByEmail`, `getRolePermissions`, `insertRevocation`, `findRevocation`,
  `touchLastLogin`. `service.ts` implements `login` (bcrypt verify + role permissions fetch +
  dual JWT signing), `refresh` (jose verify + revocation check + rotation + fresh permissions
  re-fetch), and `logout` (best-effort decodeJwt on both tokens + allSettled dual revocation).
  `deno.json` updated: `bcryptjs@2.4.3` added to import map. `index.ts` and `types.ts`
  required no changes. `deno check` not run — Deno not installed in this environment (same
  constraint as Phase 6 scaffold). Auth module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 1: `license-tracker` module backend complete. `types.ts`
  corrected to match DB column names (`issuingBody`/`issueDate` instead of scaffold's
  `issuedBy`/`issuedDate`); `category`, `reminderDays`, `status` fields added to match the
  actual License table. `repository.ts` implements `findAll` (hospitalId-scoped, expiryDate
  ASC), `findById`, `insert` (hospital_id injected), `update`, `delete` (hard), `saveDocumentUrl`,
  `clearDocumentUrl`. `service.ts` implements all 6 functions: `listLicenses`, `createLicense`
  (expiryDate presence guard, defaults for reminderDays/status), `updateLicense` (findById
  existence check + selective patch), `deleteLicense` (existence check + hard delete),
  `saveDocumentUrl` (existence check, persists URL string only — no Storage interaction),
  `removeDocument` (existence check, clears documentUrl to null). `index.ts` required
  no changes. `deno check` not run — Deno not installed in this environment.
  license-tracker Module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Caught and fixed a real regression in the above before committing:
  the subagent's `removeDocument` only cleared `documentUrl` in the DB and explicitly
  left Storage cleanup as "the caller's responsibility" — but the old
  `removeLicenseDocument` in `src/app/(hospital)/license-tracker/actions.ts` DELETED
  the file from the `license-documents` Storage bucket first (fail-closed: if that
  delete failed, the DB field was never cleared). The openapi.yaml contract for
  `DELETE /license-tracker/{id}/document` never carried a `filePath`, so as scaffolded
  this would have silently leaked an orphaned Storage object every time someone
  removed a license document — a real "hole" relative to old behavior, not just a
  missing nice-to-have. Fixed server-side (no client/contract change needed): the
  file path is now derived from the license's own `documentUrl` (same
  `/object/public/license-documents/` marker-parsing logic the old frontend's
  `src/lib/storage.ts getFilePathFromUrl()` used), the Storage object is deleted
  before the DB field is cleared, and the whole operation fails (DB untouched) if
  that delete fails — matching the old fail-closed order exactly. openapi.yaml's
  description for this endpoint updated to match; re-linted clean.
- **2026-09-22** — Phase 7 Wave 1: `analytics` module backend complete (19 endpoints).
  `types.ts` extended with 19 response type interfaces (AnalyticsOverview, GenderDistribution,
  AgeGroup, RevenueByCategory, TimeSeriesPoint, TopService, ExpenseByCategory, DailyFinancial,
  FinancialSummary, PaymentModeBreakdown, DoctorPerformance, StatusDistribution, CommonDiagnosis,
  CommonMedicine, CommonInvestigation, PharmacySaleStat, LabTestStat, ReferralStat,
  SurgeryBreakdown, RegionStat) plus TimeFilter type. `repository.ts` implements all 19 query
  methods with mandatory hospital_id scoping on every Supabase query (ADR-007). Three
  module-local private helpers: `fmt` (date formatting for time-series bucketing), `buildCountMap`
  (shared by getCommonDiagnoses + getCommonMedicines), `normalizePaymentMode` (payment mode
  display normalization). Two-step queries (parent IDs → child rows) used for getTopServices
  (Prescription → InvoiceItem), getTopPharmacySales (PharmacyBill → PharmacyBillItem),
  getTopLabTests (LabBill → LabBillItem). getOverview has two sequential conditional
  sub-queries after the main parallel batch (followUpVisits, surgeryConverted). `service.ts`
  implements `resolveDateRange` and `getPreviousRange` helpers; all 19 functions are thin
  orchestrators (date range → repo call → return). `index.ts` not modified (already correct).
  `deno check` not run — Deno not installed in this environment. Analytics module Status
  Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 1: `call-logs` module backend complete. `repository.ts`
  implements all data-access methods: `getCallsInRange`, `getCallsStatusInRange`,
  `listCallLogs`, `getTodayStats`, `findById`, `updateNotes`, `linkPatient`,
  `searchPatients`, `findExistingSids`, `findPatientsByPhoneDigits`, `insertCallLogs`
  (sync batch insert), `findBySid`, `updateById`, `insertOne`, `findPatientByPhone`
  (webhook upsert path) — every query scoped by `hospital_id` per ADR-007.
  `service.ts` implements all 8 functions: `getAnalytics` (date-range resolution,
  full in-memory aggregation matching old actions.ts output shape), `listCallLogs`
  (paginated, rawResponse stripped from list), `getStats` (today's call summary),
  `updateNotes`, `linkPatient` (fetches patient fullName for callerName), `searchPatients`
  (blank-query guard), `syncExotel` (Exotel v1 API, btoa() for Basic-Auth, Leg2Status
  resolution, batched detail fetch, patient phone-match, bulk insert), `processWebhook`
  (full upsert logic ported from route.ts — Leg2Status preferred, status-field fallback,
  patient auto-link, skip-overwrite guard for already-final records). H-2 fail-closed
  already in index.ts from Phase 6; body processing now wired to service. Exotel
  auth uses `Deno.env.get('EXOTEL_SID/API_KEY/API_TOKEN')` + `btoa()` (no Buffer).
  PII (callerName, callFrom, callTo) never logged. `deno check` not run — Deno not
  installed in this environment (same constraint as auth module Wave 1). Status
  Summary Backend column for call-logs: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 2: `queue` module backend complete (3 endpoints).
  `types.ts` extended with `OpdQueueEntry`, `WorkupQueueEntry`, `InpatientBoardEntry`
  type aliases (wide `Record<string, unknown>` — shapes come from PostgREST nested joins).
  `repository.ts` implements `QueueRepository` with three methods: `getOpdQueue` (ports
  `getDoctorQueue` — three parallel Patient queries on appointment/prescription/eye-reading
  date ranges, merge by patientId, in-process IST date filter on nested relations, status
  computed via module-local `computeStatus`), `getWorkupQueue` (ports `getWorkupQueue` —
  same three-query pattern with lighter prescription select: id/status/prescriptionDate/
  doctorName/createdAt, no InvoiceItem/LabBill expansion), `getInpatientBoard` (new — reads
  InPatient table, filters status != DISCHARGED, orders admissionDate ascending). Three
  module-local private helpers: `toISTDateISO` (IST date string), `getISTDayBounds`
  (IST midnight–23:59:59.999 boundaries as UTC Date objects, both porting old utils.ts
  behavior exactly), `computeStatus` (ports old `computePatientStatus` — MOVED/CANCELLED/
  NO_SHOW/VISITED override, else COMPLETED/WORKUP_DONE/MEDICAL_ONLY/REGISTERED).
  Every query scoped by `.eq('hospital_id', this.hospitalId)` per ADR-007.
  `service.ts` implements three thin orchestrators: `getOpdQueue`, `getWorkupQueue`,
  `getInpatientBoard` — each instantiates `QueueRepository` with `session.hospitalId`
  and delegates to the repository. `index.ts` and `types.ts`'s `QueueQuerySchema`
  required no changes.
  Realtime gap fixed: new migration `20260922010000_enable_realtime_queue_tables.sql`
  adds `Patient`, `Prescription`, `EyeReading`, and `InPatient` to the
  `supabase_realtime` publication. Rationale: without this, Supabase Realtime CDC
  events for these tables are never broadcast, so the frontend's
  `hospital:{hospitalId}:queue` and `hospital:{hospitalId}:beds` channel subscriptions
  silently receive nothing. `Patient` covers both the queue and appointments channels
  (there is no separate Appointment table — appointments live on `Patient.appointmentDate`).
  `deno check` not run — Deno not installed in this environment.
  queue module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 2: `doctor` module backend complete (11 endpoints).
  `types.ts` corrected: `PrescriptionSchema` updated from stub (id/doctorId/diagnosis
  only) to the full real schema (patientId, doctorName, department, vitals, complaint,
  history, diagnosis, additionalNotes, medicines array, investigations array, followUpDate,
  notes). `MedicineMasterSchema` updated from stub (genericName/dosageForm) to real DB
  columns (name, category, defaultTiming, defaultDays, note). `repository.ts` implements
  `DoctorRepository` with hospital_id scoping on every query (ADR-007): `getQueue`
  (three parallel Supabase queries + Map de-dup by patientId), `findPatient`,
  `findTodayPrescription`, `insertPrescription`, `updatePrescription`, `getMedicineMaster`,
  `insertMedicine`, `getInvestigationMaster`, `getPredefinedTemplates`, `getDropdownOptions`
  (bucketed by fieldName for the 4 doctor fields), `dropdownOptionExists`, `insertDropdownOption`,
  `findPatientWithReceipt`, `getHospitalProfile` (no hospital_id — singleton table).
  `service.ts` implements all 11 functions: IST day-bound helpers and `computePatientStatus`
  inlined (no Next.js import). `getDoctorQueue`: three-query merge + nested-relation filter
  to today + status computation. `getPatientConsultation`: single fetch + today/past split
  + todayPrescription/pastPrescriptions fields. `savePrescription` upsert: finds today's
  existing Prescription by (patientId, prescriptionDate in IST range) → UPDATE if found,
  INSERT if not; medicines/investigations JSON-stringified; followUpDate converted to IST
  midnight UTC; status always "COMPLETED". `getReferenceData`: parallel fetch of all 4
  reference types, maps investigations to name-only array. `getDropdownOptions`: returns
  grouped object. `addDropdownOption`: idempotent (no-op if exists). `createMedicine`:
  inserts with hospital_id + createdBy. `getPatientReceipt` (billing:view): parallel
  patient+hospital fetch, filters to today's prescription and eye reading, returns
  { patient, hospital, prescription, eyeReading }. AI-assist feature (`askSithaAI` in
  src/app/(hospital)/doctor/ai-actions.ts) confirmed present but deferred — no doctor-tag
  endpoint in openapi.yaml covers it; needs its own endpoint design when frontend is built.
  `index.ts` required no changes (all 11 routes already wired correctly in Phase 6 scaffold).
  `deno check` not run — Deno not installed in this environment.
  doctor module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 2: `settings` module backend complete (33 endpoints). `types.ts`
  corrected to match actual DB columns: `ServiceTemplateSchema` field `price` renamed to `amount`
  (DB column name) with `description`/`discount`/`sortOrder`/`isActive` added; `HospitalProfileSchema`
  expanded with all known DB fields (`displayName`, `website`, `registrationNo`, `gstin`,
  `registrationFeeEnabled/Amount/DefaultChecked`, `tone`, `departments`, `settings`);
  `PredefinedTemplateSchema` rebuilt with `code`, `medicines`/`investigations` as TEXT strings,
  and all optional clinical fields; `InpatientTemplateSchema` rebuilt with `code` and clinical
  fields; `PredefinedPackageSchema` renamed `price`→`totalAmount`, `items`→`inclusions` (TEXT);
  `PredefinedSurgerySchema` rebuilt with all surgical fields; `PredefinedDischargeSchema` rebuilt
  with all discharge fields; `MedicineMasterSchema` corrected from non-existent `genericName`/
  `dosageForm` to actual DB fields `defaultTiming`, `defaultDays`, `note`, `sortOrder`.
  Named type aliases added for service.ts import. `repository.ts` implements all data-access
  methods: 5 for ServiceTemplate (list, findById, insert, update, hard-delete), 2 for
  HospitalProfile (get, upsert), 6 for PredefinedTemplate (+ findByCode), 6 for
  InpatientTemplate (+ findByCode), 5 for PredefinedPackage (+ findByName), 5 for
  PredefinedSurgery (+ softDelete), 5 for PredefinedDischarge (+ softDelete), 5 for
  MedicineMaster (+ findByName) — 39 repository methods total, every query scoped by
  `hospital_id` per ADR-007. `service.ts` implements all 33 service functions: hard-deletes
  for ServiceTemplate, PredefinedTemplate, InpatientTemplate, PredefinedPackage, MedicineMaster;
  soft-deletes (isActive=false) for PredefinedSurgery and PredefinedDischarge (matching old
  actions.ts exactly); HospitalProfile upsert pattern; PrintConfig and NavStyle stored inside
  HospitalProfile.settings JSON blob (same pattern as old saveDefaultPrintConfig/updateNavStyle).
  Uniqueness guards: PredefinedTemplate by code, InpatientTemplate by code, PredefinedPackage
  by name, MedicineMaster by name — all scoped to hospitalId (multi-tenant correct; old code
  was unscoped single-tenant). `index.ts` required no changes (route wiring was correct).
  Service-templates divergence note: `patients/actions.ts` uses `amount` (same as DB) and
  includes `isActive`/`discount` in select — settings module now matches this exactly, no
  divergence from the DB column perspective. `deno check` not run — Deno not installed in
  this environment (same constraint as all prior Wave 1 modules).
  settings Module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 2: `patient-care` module backend complete (28 endpoints).
  `repository.ts` implements all data-access methods in two logical sections (Patient +
  InPatient) plus billing-adjacent helpers and dropdown options, all in one class per
  ADR-006 (single deployable). Tenant isolation enforced on every query via
  `.eq('hospital_id', this.hospitalId)` (ADR-007). **H-3 fix confirmed**: three RPC
  calls replace the old race-prone "SELECT MAX + 1" pattern —
  `supabase.rpc('next_patient_number')` for Patient.patientId,
  `supabase.rpc('next_ip_number')` for InPatient.ipNumber, and
  `supabase.rpc('next_prescription_number', { p_year })` for Prescription.prescriptionNumber;
  no MAX+1 pattern anywhere in the new code. `service.ts` implements all 28 functions:
  `listPatients` (paginated, computes derived status via `computePatientStatus()` helper),
  `searchPatients` (cursor-based, enriches with fullName/lastVisitDate),
  `getNextPatientId`/`getNextInPatientId` (call RPCs — gaps accepted by design),
  `getPatientRegistrationFormData`/`getAdmissionFormData` (parallel bundle fetches, do NOT
  call sequence RPCs to avoid wasting slots on form opens), `createPatient`/`createInPatient`
  (call RPCs for definitive ID at write time), full CRUD + status/date/discharge actions for
  both Patient and InPatient, and the three billing-adjacent endpoints
  (`getPatientReceiptData`, `addServiceToPatient`, `createPrescriptionWithBilling`) kept in
  this module per spec — they are NOT moved to the billing module, and no cross-module calls
  are made (the shared prescription-upsert logic is duplicated with comment per the
  architecture rule). `addDropdownOption` uses upsert semantics (existence check + insert,
  no DB UNIQUE violation on duplicate). Billing-adjacent prescription-upsert logic: checks
  for today's prescription before creating, appending to it if found (same behavior as old
  `addServiceToPatient`/`createPrescriptionWithBilling`). `dischargeInPatient` stores
  discharge summary as JSON in `dischargeNotes`; `addInPatientPayment` appends to
  `paymentRecords` JSON array and recalculates totals. `deletePatient` cascades in FK-safe
  order (payments → invoice items → eye readings → prescriptions → insurance claims →
  inpatient → patient). No PII in log calls. `index.ts` not modified. `deno check` not run
  — Deno not installed in this environment. patient-care Module Status Summary Backend
  column: ⬜ → ✅.
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
- **2026-09-22** — Phase 7 Wave 2: `staff` module backend complete (12 endpoints). `types.ts` extended with `StaffMemberResponse` and `RoleResponse` output interfaces (passwordHash never included in responses). `repository.ts` implements `StaffRepository` with full hospital_id scoping on every User query (ADR-007) and no hospital_id on Role queries (Role is a global table, confirmed by auth/repository.ts). Methods: `findMembers`, `findMemberById`, `findMemberByEmail`, `findMemberByEmployeeId`, `insertMember`, `updateMember`, `updatePasswordHash`, `findRoles`, `findRoleById`, `findRoleByName`, `countUsersByRoleName`, `insertRole`, `updateRole`, `deleteRole`, `upsertSystemRole`. `service.ts` implements all 12 functions. Password hashing: `bcryptjs.hash(password, 10)` — cost factor 10 matches old `actions.ts`; plaintext never logged. `createMember` provisions a Supabase Auth identity via `supabase.auth.admin.createUser()` (service_role key) then inserts the User row with the resulting UUID. `resetPassword` hashes first, writes DB (source of truth), then best-effort syncs to Supabase Auth (logs a warn on failure, does not fail the request). `toggleActive` guards against a user modifying their own active flag. `deleteRole` guards against deleting system roles and roles still assigned to users. `updateRolePermissions` performs no key validation (matching old actions.ts which also validated nothing — just wrote the array verbatim). `seedSystemRoles` upserts all 5 system roles (ADMIN, DOCTOR, RECEPTIONIST, OPTOMETRIST, NURSE) from a hardcoded `SYSTEM_ROLES` constant that matches the CURRENT `DEFAULT_ROLE_PERMISSIONS` in `src/lib/permissions.ts` including the 3 new permission groups (billing:*, queue:view, call_logs:*) — idempotent upsert (check-then-insert/update per role), never a blind overwrite that would clobber the migration's per-key append work. `index.ts` not modified (no bugs found). `deno check` not run — Deno not installed in this environment. staff module Status Summary Backend column: ⬜ → ✅.
  - Phase 7 handoff notes from the backend scaffold (not yet done):
    finalize `auth/repository.ts`'s logout token_revocation insert
    (currently a stub even though the read-side jti check is real),
    and register the 3 new permission keys (`billing:*`, `call_logs:*`,
    `queue:view`) in `src/lib/permissions.ts` — already flagged in
    Known Deferred Items above, repeating here since it's now blocking
    Phase 7 start, not just a future concern.
- **2026-09-22** — Phase 7 Wave 2: `doctor` module 12th endpoint (`POST /doctor/ai/ask`)
  implemented. Four new files added to the doctor Edge Function:
  `gemini-client.ts` (Gemini REST wrapper — M-5 fixed: API key sent as `x-goog-api-key`
  header, never as a URL `?key=` param, never logged), `ai-context.ts` (patient context
  builder + analytics context builder + resolvePatientContext + extractPatientToken —
  all Supabase queries hospital_id-scoped per ADR-007; analytics context uses lean direct
  queries rather than cross-module imports from the analytics Edge Function per ADR-006),
  `types.ts` extended with `AskSithaSchema`/`AskSitha`, `service.ts` extended with
  `askSithaAI` (two modes: patient-clinical and analytics; metadata-only logging — question
  text/answer/patient identifiers never logged), `index.ts` updated to 12 endpoints.
  GEMINI_API_KEY and GEMINI_MODEL are read from `Deno.env` (Edge Function secrets) — never
  exposed to clients. `deno check` not run — Deno not installed in this environment.
  doctor module Status Summary Backend column: 🔨 → ✅ (all 12 endpoints done).
