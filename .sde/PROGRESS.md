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
| 2 | health | 2 | ✅ | n/a | ⬜ | n/a |
| 3 | patient-care | 28 | ✅ | ⬜ | ⬜ | ⬜ |
| 4 | billing | 5 | ✅ | ⬜ | ⬜ | ⬜ |
| 5 | pharmacy | 21 | ✅ | ⬜ | ⬜ | ⬜ |
| 6 | labs | 14 | ✅ | ⬜ | ⬜ | ⬜ |
| 7 | optical | 16 | ✅ | ⬜ | ⬜ | ⬜ |
| 8 | insurance | 11 | ✅ | ⬜ | ⬜ | ⬜ |
| 9 | queue | 3 | ✅ | ⬜ | ⬜ | ⬜ |
| 10 | doctor | 12 | ✅ | ⬜ | ⬜ | ⬜ |
| 11 | staff | 12 | ✅ | ⬜ | ⬜ | ⬜ |
| 12 | settings | 33 | ✅ | ⬜ | ⬜ | ⬜ |
| 13 | analytics | 19 | ✅ | ⬜ | ⬜ | ⬜ |
| 14 | reports | 17 | ✅ | ⬜ | ⬜ | ⬜ |
| 15 | workup | 4 | ✅ | ⬜ | ⬜ | ⬜ |
| 16 | expenses | 10 | ✅ | ⬜ | ⬜ | ⬜ |
| 17 | dues-followups | 8 | ✅ | ⬜ | ⬜ | ⬜ |
| 18 | call-logs | 8 | ✅ | ⬜ | ⬜ | ⬜ |
| 19 | license-tracker | 6 | ✅ | ⬜ | ⬜ | ⬜ |
| 20 | dashboard | 2 | ✅ | ⬜ | ⬜ | ⬜ |
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
| Pharmacy bill sequence | **RESOLVED** — migration `20260922020000_pharmacy_bill_sequence.sql` creates `pharmacy_bill_number_seq` and `next_pharmacy_bill_number(p_year TEXT)` following the exact pattern of `next_prescription_number`. Repository calls `supabase.rpc('next_pharmacy_bill_number', { p_year })`. New format: `PH-YYYY-NNNN` (old `PH-YYYYMMDD-NNNN` format superseded; no collision risk). See Phase 7 Wave 3 session log entry 2026-09-22. | 5-api-design.md §8.8 — **resolved 2026-09-22** |
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
| ✅ | GET | /health | public | new |
| ✅ | GET | /health/db | public | new |

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
| ✅ | GET | /billing/daily | `billing:view` (new) | Aggregates today's Prescription revenue |
| ✅ | GET | /billing/prescriptions | `billing:view` (new) | List prescriptions with amounts/payments |
| ✅ | GET | /billing/prescriptions/{id} | `billing:view` (new) | Single prescription + items + payments |
| ✅ | POST | /billing/prescriptions/{id}/payments | `billing:create` (new) | Record additional payment |
| ✅ | DELETE | /billing/prescriptions/{id}/payments/{payId} | `billing:delete` (new) | Void a payment (admin only) |

### pharmacy (21)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /pharmacy/medicines | `pharmacy:view` | `getMedicines` |
| ✅ | POST | /pharmacy/medicines | `pharmacy:manage_stock` | `createMedicine` |
| ✅ | PATCH | /pharmacy/medicines/{id} | `pharmacy:manage_stock` | `updateMedicine` |
| ✅ | DELETE | /pharmacy/medicines/{id} | `pharmacy:manage_stock` | `deleteMedicine` (soft) |
| ✅ | GET | /pharmacy/stock | `pharmacy:view` | `getStock` |
| ✅ | POST | /pharmacy/stock | `pharmacy:manage_stock` | `addStock` |
| ✅ | PATCH | /pharmacy/stock/{id} | `pharmacy:manage_stock` | `updateStock` |
| ✅ | GET | /pharmacy/stock/summary | `pharmacy:view` | `getStockSummary` |
| ✅ | GET | /pharmacy/stock/search | `pharmacy:view` | `searchMedicineStock` |
| ✅ | GET | /pharmacy/suppliers | `pharmacy:view` | `getSuppliers` |
| ✅ | POST | /pharmacy/suppliers | `pharmacy:manage_stock` | `createSupplier` |
| ✅ | PATCH | /pharmacy/suppliers/{id} | `pharmacy:manage_stock` | `updateSupplier` |
| ✅ | DELETE | /pharmacy/suppliers/{id} | `pharmacy:manage_stock` | `deleteSupplier` (soft) |
| ✅ | GET | /pharmacy/purchase-orders | `pharmacy:purchase_orders` | `getPurchaseOrders` |
| ✅ | POST | /pharmacy/purchase-orders | `pharmacy:purchase_orders` | `createPurchaseOrder` |
| ✅ | POST | /pharmacy/purchase-orders/{id}/receive | `pharmacy:purchase_orders` | `receivePurchaseOrder` |
| ✅ | PATCH | /pharmacy/purchase-orders/{id}/status | `pharmacy:purchase_orders` | `updatePOStatus` |
| ✅ | GET | /pharmacy/bills | `pharmacy:view` | `getPharmacyBills` |
| ✅ | POST | /pharmacy/bills | `pharmacy:create` | `createPharmacyBill` — atomic sequence via `next_pharmacy_bill_number` RPC (see Known Deferred Items — RESOLVED) |
| ✅ | GET | /pharmacy/pending-medicines | `pharmacy:view` | `getPendingMedicines` |
| ✅ | GET | /pharmacy/patients/{patientId}/prescription | `pharmacy:view` | `getPatientPrescription` |

### labs (14)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /labs/labs | `labs:view` | `getLabs` |
| ✅ | POST | /labs/labs | `labs:config` | `createLab` |
| ✅ | GET | /labs/labs/{id} | `labs:view` | `getLabById` |
| ✅ | PATCH | /labs/labs/{id} | `labs:config` | `updateLab` |
| ✅ | DELETE | /labs/labs/{id} | `labs:config` | `deleteLab` (soft) |
| ✅ | GET | /labs/labs/{labId}/investigations | `labs:view` | `getLabInvestigations` |
| ✅ | GET | /labs/investigations | `labs:view` | `getAllInvestigations` |
| ✅ | POST | /labs/investigations | `labs:config` | `createInvestigation` |
| ✅ | PUT | /labs/labs/{labId}/investigations | `labs:config` | `updateLabInvestigations` (replace-all) |
| ✅ | GET | /labs/patients/{patientId}/investigations | `labs:view` | `getPatientInvestigations` |
| ✅ | GET | /labs/pending-investigations | `labs:view` | `getPendingLabInvestigations` |
| ✅ | GET | /labs/bills | `labs:view` | `getLabBills` |
| ✅ | POST | /labs/bills | `labs:create` | `createLabBills` (multi-bill) |
| ✅ | GET | /labs/bills/{id} | `labs:view` | `getLabBillById` |

*(Lab result recording is explicitly deferred — see Known Deferred Items.)*

### optical (16)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /optical/products | `optical:view` | `getOpticalProducts` |
| ✅ | POST | /optical/products | `optical:edit` | `createOpticalProduct` |
| ✅ | PATCH | /optical/products/{id} | `optical:edit` | `updateOpticalProduct` |
| ✅ | DELETE | /optical/products/{id} | `optical:edit` | `deleteOpticalProduct` (soft) |
| ✅ | GET | /optical/stock | `optical:view` | `getOpticalStock` |
| ✅ | POST | /optical/stock | `optical:edit` | `addOpticalStock` (upsert) |
| ✅ | PATCH | /optical/stock/{id} | `optical:edit` | `updateOpticalStock` |
| ✅ | GET | /optical/stock/summary | `optical:view` | `getStockSummary` |
| ✅ | GET | /optical/stock/search | `optical:view` | `searchOpticalStock` |
| ✅ | GET | /optical/bills | `optical:view` | `getOpticalBills` |
| ✅ | POST | /optical/bills | `optical:create` | `createOpticalBill` |
| ✅ | PATCH | /optical/bills/{id}/status | `optical:edit` | `updateOpticalBillStatus` |
| ✅ | GET | /optical/patients/{patientId}/ar-reading | `optical:view` | `getPatientWithARReading` |
| ✅ | GET | /optical/settings | `settings:view` | `getOpticalSettings` |
| ✅ | PATCH | /optical/settings | `settings:edit` | `updateOpticalSettings` |
| ✅ | GET | /optical/hospital-profile | `optical:view` | `getOpticalHospitalProfile` |

### insurance (11)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /insurance/companies | `insurance:view` | `getInsuranceCompanies` (+ `?paginated=false` for all, merged from old `/all`) |
| ✅ | POST | /insurance/companies | `insurance:edit` | `createInsuranceCompany` |
| ✅ | PATCH | /insurance/companies/{id} | `insurance:edit` | `updateInsuranceCompany` |
| ✅ | DELETE | /insurance/companies/{id} | `insurance:edit` | `deleteInsuranceCompany` (soft) |
| ✅ | GET | /insurance/claims | `insurance:view` | `getInsuranceClaims` |
| ✅ | POST | /insurance/claims | `insurance:create` | `createInsuranceClaim` |
| ✅ | GET | /insurance/claims/{id} | `insurance:view` | `getInsuranceClaimById` |
| ✅ | PATCH | /insurance/claims/{id}/status | `insurance:edit` | `updateInsuranceClaimStatus` |
| ✅ | PATCH | /insurance/claims/{id}/details | `insurance:edit` | `updateInsuranceClaimDetails` |
| ✅ | POST | /insurance/claims/{id}/payments | `insurance:edit` | `addInsurancePatientPayment` |
| ✅ | GET | /insurance/inpatients/search | `insurance:view` | `searchInPatientsForInsurance` |

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
| ✅ | GET | /reports/patients/search | `reports:view` | `searchPatients` (reports) |
| ✅ | GET | /reports/patients/{patientId}/summary | `reports:view` | `getPatientSummary` |
| ✅ | GET | /reports/patients/{patientId}/visits | `reports:view` | `getVisitHistory` |
| ✅ | GET | /reports/patients/{patientId}/prescriptions | `reports:view` | `getPrescriptions` |
| ✅ | GET | /reports/patients/{patientId}/inpatient | `reports:view` | `getInpatientRecords` |
| ✅ | GET | /reports/patients/{patientId}/receipt | `reports:view` | `getReportReceiptData` |
| ✅ | GET | /reports/patients/{patientId}/labs | `reports:view` | `getLabRecords` |
| ✅ | GET | /reports/patients/{patientId}/billing | `reports:view` | `getBillingOverview` |
| ✅ | GET | /reports/exports/patients | `data:export` | `getExportPatients` (data) |
| ✅ | GET | /reports/exports/prescriptions | `data:export` | `getExportPrescriptions` |
| ✅ | GET | /reports/exports/eye-readings | `data:export` | `getExportEyeReadings` |
| ✅ | GET | /reports/exports/inpatients | `data:export` | `getExportInPatients` |
| ✅ | GET | /reports/exports/insurance-claims | `data:export` | `getExportInsuranceClaims` |
| ✅ | GET | /reports/exports/lab-bills | `data:export` | `getExportLabBills` |
| ✅ | GET | /reports/exports/pharmacy-bills | `data:export` | `getExportPharmacyBills` |
| ✅ | GET | /reports/exports/optical-bills | `data:export` | `getExportOpticalBills` |
| ✅ | GET | /reports/exports/expenses | `data:export` | `getExportExpenses` |

*(PDF generation/storage is explicitly deferred — see Known Deferred Items.)*

### workup (4)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /workup/queue | `workup:view` | `getWorkupQueue` |
| ✅ | GET | /workup/patients/{patientId} | `workup:view` | `getPatientForWorkup` |
| ✅ | POST | /workup/patients/{patientId}/eye-readings | `workup:create` | `saveEyeReading` (upsert) |
| ✅ | POST | /workup/patients/{patientId}/start | `workup:create` | `startWorkup` — **no-op, deprecated, keep for compat only** |

### expenses (10)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | POST | /expenses/categories/seed | `expenses:edit` | `seedDefaultCategories` |
| ✅ | GET | /expenses/categories | `expenses:view` | `getCategories` |
| ✅ | POST | /expenses/categories | `expenses:edit` | `createCategory` |
| ✅ | PATCH | /expenses/categories/{id} | `expenses:edit` | `updateCategory` |
| ✅ | DELETE | /expenses/categories/{id} | `expenses:edit` | `deleteCategory` |
| ✅ | PATCH | /expenses/categories/reorder | `expenses:edit` | `reorderCategories` (bulk) |
| ✅ | GET | /expenses | `expenses:view` | `getExpensesByDateRange` |
| ✅ | POST | /expenses | `expenses:create` | `createExpense` |
| ✅ | PATCH | /expenses/{id} | `expenses:edit` | `updateExpense` |
| ✅ | DELETE | /expenses/{id} | `expenses:delete` | `deleteExpense` |

### dues-followups (8)
| Status | Method | Path | Permission | Source |
|---|---|---|---|---|
| ✅ | GET | /dues-followups/dues | `dues:view` | `getDues` (crosses Prescription/InPatient/LabBill/PharmacyBill) |
| ✅ | GET | /dues-followups/followups | `dues:view` | `getFollowUps` |
| ✅ | PATCH | /dues-followups/dues/{id}/mark-paid | `dues:edit` | `markDueAsPaid` |
| ✅ | GET | /dues-followups/doctors | `dues:view` | `getDoctorList` |
| ✅ | GET | /dues-followups/departments | `dues:view` | `getDepartmentList` |
| ✅ | GET | /dues-followups/email-templates | `dues:view` | `getAvailableTemplates` |
| ✅ | GET | /dues-followups/hospital-name | `dues:view` | `getHospitalDisplayName` |
| ✅ | POST | /dues-followups/send-email | `dues:edit` | `sendPatientEmail` |

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
| ✅ | GET | /dashboard/summary | `reports:view` | Aggregates today's patient + revenue stats |
| ✅ | GET | /dashboard/quick-stats | `reports:view` | YTD/MTD totals, active inpatient count |

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
- **2026-09-22** — Phase 7 Wave 3: `labs` module backend complete (14 endpoints).
  `types.ts` corrected: `LabSchema` extended with `description`, `location`, `isActive`,
  `sortOrder` (all present in the DB); scaffold's erroneous `isDeleted` field removed (Lab
  table has no such column — soft-delete uses `isActive`). `LabBillItemSchema.price` renamed
  to `amount` (matching DB column `amount`). `LabBillSchema.totalAmount` renamed to `total`
  (matching DB column `total`); `discount` and `discountReason` added as optional fields.
  `repository.ts` implements `LabsRepository` with full hospital_id scoping on every entity
  query (ADR-007); child/junction tables (LabInvestigation, LabBillItem, LabPayment) accessed
  via parent FK only — no hospital_id on those tables, consistent with 4-datamodel.md §5.2.
  Methods: `findAll`, `countInvestigationsForLab`, `findById`, `insert`, `update`,
  `softDelete` (Lab); `findLabInvestigations`, `replaceLabInvestigations`,
  `findLabMappingsByInvestigationIds` (LabInvestigation); `findAllInvestigations`,
  `findInvestigationByName`, `findInvestigationsByNames`, `insertInvestigation`
  (InvestigationMaster); `findPatientByPatientId`, `findLatestPrescriptionWithInvestigations`,
  `findBillsForPrescription`, `findPrescriptionsWithInvestigationsBetween`,
  `findBillStatusesByPrescriptionIds`, `getNextBillNumber`, `insertBill`, `insertBillItems`,
  `insertPayment`, `findBills`, `countBills`, `findBillById`.
  `service.ts` implements all 14 functions. Key semantics:
  — `createLabBills` (multi-bill): iterates `data.bills` array and creates ONE LabBill per
    entry; each entry targets its own lab, has its own total/discount/payment; LabBillItems
    and (when amountPaid > 0) a LabPayment are created for each bill in the same loop. Bill
    number uses the old LB-YYYYMMDD-NNNN pattern (same TOCTOU limitation as old app; no
    lab-bill sequence exists — only patient/IP/prescription sequences from Phase 4).
  — `updateLabInvestigations` (replace-all): DELETE all LabInvestigation rows for labId,
    then INSERT new rows for each investigationId with amount=0/isDefault=false defaults
    (scaffold schema supplies only IDs, not amounts — simplification from old Next.js shape).
  — `deleteLab` (soft): sets isActive=false rather than hard-deleting; PROGRESS.md says
    "(soft)", Lab table has isActive, and a hard delete would fail on FK constraint from
    LabBill rows — the old code tried hard delete and surfaced the FK error, this is correct.
  — `getPatientInvestigations`: full multi-step logic ported from old actions.ts — patient
    lookup, latest prescription with non-empty investigations JSON, master-name resolution,
    lab-mapping fetch (LabInvestigation is NOT hospital_id-scoped — child table), active-lab
    filter, existing-bill check, group-by-lab with isDefault-preferred mapping.
  — `getPendingLabInvestigations`: uses IST today as default (index.ts does not forward a
    date param); filters out fully-billed prescriptions (no PENDING/PARTIAL bill statuses).
  `index.ts` required no changes (all 14 routes already correctly wired in Phase 6 scaffold).
  `deno check` not run — Deno not installed in this environment.
  labs module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 3: `expenses` module backend complete (10 endpoints).
  `types.ts` corrected: `ExpenseCategorySchema` was missing `color` field (real DB column
  `color TEXT NOT NULL DEFAULT '#6B7280'` — required in DB, optional via API with service-layer
  default); `ExpenseSchema` had two invented field names — `description` → `title` and
  `notes` → `reason` (both verified against `supabase-migration.sql` §24); `paymentMode`
  field (TEXT nullable, present in DB) added to `ExpenseSchema`. Named interfaces
  `ExpenseCategoryRow` and `ExpenseRow` added for full DB row shapes. openapi.yaml uses
  `description` for the expense title field — divergence from the real DB column `title`
  noted; implementation uses the DB column name `title` since the actual CREATE TABLE and
  old actions.ts both use `title`. `repository.ts` implements `ExpensesRepository` with full
  hospital_id scoping on every query (ADR-007): `countCategories` (seed idempotency check),
  `bulkInsertCategories` (seed insert), `findAllCategories` (active only, sortOrder+name order),
  `findCategoryById`, `findMaxSortOrder`, `insertCategory`, `updateCategory`, `deleteCategoryById`,
  `countExpensesForCategory` (RESTRICT guard), `updateCategoryOrders` (concurrent bulk update),
  `findExpenses` (optional date-range filter, category join, date DESC), `findExpenseById`
  (with category join), `insertExpense`, `updateExpense`, `deleteExpenseById` — 15 methods
  total. `service.ts` implements all 10 functions: `seedCategories` (idempotent —
  hospital-scoped count check before bulk insert; 10 default categories match old
  `DEFAULT_CATEGORIES` constant exactly); `listCategories` (thin delegate); `createCategory`
  (findMaxSortOrder + insert, 409 on 23505 Postgres unique violation); `updateCategory`
  (404 guard + selective patch + 409 on duplicate name); `deleteCategory` (404 guard +
  application-layer RESTRICT check before hard delete, 409 with descriptive count);
  `reorderCategories` (delegates explicit {id, sortOrder} pairs to repo — shape matches
  openapi.yaml and scaffold's ReorderCategoriesSchema, not old code's string[] shape);
  `listExpenses` (full date range filter delegate); `createExpense` (category existence
  guard + ISO date conversion + insert); `updateExpense` (existence guard + optional
  category re-validation + selective patch + ISO date conversion); `deleteExpense`
  (existence guard + hard delete). `index.ts` not modified — route wiring and permission
  guards were already correct in the Phase 6 scaffold; all imported Zod schema names
  remain exported from the updated types.ts. `deno check` not run — Deno not installed
  in this environment. expenses module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 3: `insurance` module backend complete (11 endpoints).
  `types.ts` corrected to match real DB columns: `InsuranceCompanySchema` fixed from scaffold's
  invented `contactPerson`/`phone`/`isDeleted` fields to actual DB columns `contactNumber`,
  `address`, `isActive` (confirmed from supabase-migration.sql). `InsuranceClaimSchema` rebuilt
  from scratch matching old `createInsuranceClaim` input shape: `inPatientId` (not `inpatientId`),
  `insuranceCompanyId` (not `companyId`), `insuranceCompanyName`, `tpaName`, `policyNumber`,
  `policyHolderName`, `insuranceCardNumber`, `relationToInsured`, `preauthAmount` (not `claimedAmount`),
  `notes`. `UpdateClaimStatusSchema` extended with optional `notes/amount/rejectionReason/
  settlementReference/deductions` needed for SETTLED/PREAUTH_APPROVED/rejection transitions.
  `UpdateClaimDetailsSchema` widened to also accept policy admin fields (insuranceCompanyName,
  tpaName, policyNumber, etc.) matching old `updateInsuranceClaimDetails`. `AddClaimPaymentSchema`
  gained optional `notes` field (old code supported it).
  `repository.ts` implements `InsuranceRepository` with full hospital_id scoping (ADR-007):
  `findCompanies` (paginated, activeOnly flag), `findAllCompanies` (unpaginated, no isActive filter
  — replaces old `getAllInsuranceCompanies`), `findCompanyById`, `insertCompany`, `updateCompany`,
  `softDeleteCompany` (isActive=false — NOT hard-delete), `findClaims` (paginated, optional status
  filter, narrow select for list view), `findClaimById` (full select), `insertClaim`, `updateClaim`,
  `findInpatientById` (cross-module read), `searchInpatients` (ilike/like on ipNumber/name/phone,
  limit 10), `updateInpatientPaymentRecords` (cross-module write for payment recording).
  `service.ts` implements all 11 functions. Key notes:
  — `getCompanies`: `paginated=false` → all companies no isActive filter (old `getAllInsuranceCompanies`);
    `paginated=true` → active-only paginated (old `getInsuranceCompanies`).
  — `createClaim`: uses `supabase.rpc('next_insurance_claim_number', { p_year })` for atomic claim
    number (H-3 pattern); denormalizes InPatient fields into claim row on creation; computes initial
    financial fields (patientPayable, patientBalance) from InPatient.netAmount.
  — `deleteCompany`: soft-delete only (isActive=false); verified against old `deleteInsuranceCompany`
    which set isActive=false, never hard-deleted (companies referenced by existing claims via FK).
  — `updateClaimStatus`: full status-machine implementation with financial recalculation for
    PREAUTH_APPROVED, ENHANCEMENT_APPROVED, SETTLED, PARTIALLY_SETTLED, CLAIM_REJECTED; SETTLED
    also writes an Insurance payment record to linked InPatient.paymentRecords (replacing prior
    Insurance entry to prevent double-counting on re-settlement) matching old behavior exactly.
  — `addClaimPayment`: writes to InPatient.paymentRecords JSON array (no separate InsurancePayment
    table — that table does not exist in the DB despite the scaffold comment); recomputes InPatient
    totalReceivedAmount/balanceAmount; derives authoritative patientCashPaid from non-Insurance
    records only; updates claim patientPaidAmount/patientBalance/statusHistory — all matching old
    `addInsurancePatientPayment` exactly.
  — `searchInpatients`: filters InPatient on ipNumber/name/phone ilike/like with min 2-char guard,
    returns id/ipNumber/name/age/gender/phone/department/packageAmount/netAmount/admissionDate/
    operationName — exactly what old `searchInPatientsForInsurance` returned.
  `index.ts` bug fix: scaffold passed only `b.data.status` to `updateClaimStatus`, silently
  discarding amount/notes/rejectionReason needed for SETTLED/PREAUTH_APPROVED transitions (would
  record $0 settled amount). Fixed to pass full `b.data` (UpdateClaimStatus typed object).
  openapi.yaml field discrepancy noted: InsuranceCompany schema uses `contactPerson`/`phone` but
  DB has `contactNumber`/`address` — implementation uses DB column names to prevent silent data
  loss; this is a spec bug not a code bug.
  `deno check` not run — Deno not installed in this environment.
  insurance module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 3: `dues-followups` module backend complete (8 endpoints).
  `types.ts` extended with `DueRecord`, `FollowUpRecord`, `EmailTemplate` interfaces and named
  type aliases `DuesListQuery`, `MarkPaidInput`, `SendEmailInput`. `repository.ts` implements
  `DuesFollowupsRepository` with mandatory `.eq('hospital_id', this.hospitalId)` on every
  Prescription/InPatient/LabBill/PharmacyBill query (ADR-007), and correctly uses
  `.eq('id', this.hospitalId)` on HospitalProfile (no hospital_id column — its own id IS the
  hospital identifier; this is the exact bug that broke settings and doctor modules). Methods:
  `getAllOPDDues` (Prescription balanceDue > 0, joins Patient + InvoiceItem),
  `getAllIPDDues` (InPatient balanceAmount > 0, joins Patient for UHID),
  `getAllLABDues` (LabBill balanceDue > 0, not CANCELLED, joins Patient + Lab + LabBillItem),
  `getAllPharmacyDues` (PharmacyBill balanceDue > 0, joins PharmacyBillItem!billId),
  `getAllOPDFollowups` (Prescription followUpDate not null), `getAllIPDFollowups`
  (InPatient followUpDate not null, joins Patient for UHID + email),
  `findPrescriptionForPaid` / `markPrescriptionPaid` / `insertPayment` (Payment row uses
  crypto.randomUUID() for id — no DB DEFAULT exists), `findInpatientForPaid` /
  `markInpatientPaid` (paymentRecords JSON array append), `findLabBillForPaid` /
  `markLabBillPaid` / `insertLabPayment` (LabPayment row uses crypto.randomUUID()),
  `findPharmacyBillForPaid` / `markPharmacyBillPaid` (no payment record, just balance update),
  `getDistinctDoctorNames` / `getDistinctDepartments` (from Prescription, deduped in service),
  `getHospitalProfile`, `findPatientByUhid`. `service.ts` implements all 8 functions:
  `getDues` (four parallel repository calls → combined sort date-desc → in-memory pagination),
  `getFollowups` (two parallel calls → combined sort followUpDate-asc → in-memory pagination;
  includes ALL non-null followUpDate records — overdue + future — callers use `isOverdue` flag),
  `markPaid` (dispatches on type enum: prescription/labBill/pharmacyBill/inpatient, each with
  hospital-scoped existence check before write; paymentMode defaults to 'CASH'),
  `getDoctors` / `getDepartments` (thin delegates), `getEmailTemplates` (calls Sitha
  SITHA_API_URL/api/v1/templates with SITHA_API_KEY header; returns [] on missing config or
  non-OK response — exactly matching old getAvailableTemplates() behavior), `getHospitalName`
  (repo.getHospitalProfile → displayName ?? name ?? 'Hospital'), `sendEmail` (looks up patient
  by UHID to resolve email; throws ServiceUnavailableError if SITHA not configured or API fails;
  throws ValidationError if patient not found or has no email; never logs patient PII).
  `sendEmail` email integration: REAL external call to Sitha AI service via SITHA_API_URL +
  SITHA_API_KEY — not a stub. Matches old sendPatientEmail which also called
  `${sithaUrl}/api/v1/email/send` — the same env var names are used. `index.ts` verified
  correct, no changes made. `deno check` not run — Deno not installed in this environment.
  dues-followups module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 3: `pharmacy` module backend complete (21 endpoints).
  New migration `20260922020000_pharmacy_bill_sequence.sql` created: adds
  `pharmacy_bill_number_seq` (yearly-scoped, CACHE 1) and `next_pharmacy_bill_number(p_year TEXT)`
  Postgres function following the exact pattern of `next_prescription_number` in
  migration `20260921130000_atomic_sequences.sql`. Closes the "Pharmacy bill sequence"
  Known Deferred Item — old `getNextBillNumber()` TOCTOU race replaced by atomic RPC.
  New bill number format: `PH-YYYY-NNNN` (old `PH-YYYYMMDD-NNNN` daily format superseded;
  no collision risk since formats are distinct). `types.ts` corrected: scaffold had wrong
  field names (`purchasePrice`/`sellingPrice` → `mrp`/`costPrice` matching actual DB columns
  in PharmacyStock; `isDeleted` removed from Medicine/Supplier — DB soft-deletes via
  `isActive=false`; `patientName` added as required to `CreatePharmacyBillSchema` — NOT NULL
  in DB; `discountPercent`/`roundOff`/`paymentMode`/`paidAmount` added to bill header;
  full item fields restored; PO status enum corrected to uppercase DB values; `ReceiveItemSchema`
  rebuilt to match actual receive flow: `itemId`/`receivedQty`/`batchNumber`/`expiryDate`/
  `mrp`/`costPrice`). `repository.ts` implements `PharmacyRepository` with all data-access
  methods (hospital_id scoped on every entity query per ADR-007): `findAllMedicines`,
  `findMedicineById`, `insertMedicine`, `updateMedicine`, `softDeleteMedicine`;
  `findAllSuppliers`, `findSupplierById`, `findSupplierCountsByIds`, `insertSupplier`,
  `updateSupplier`, `softDeleteSupplier`; `findAllStock`, `findStockById`,
  `findStockByMedicineAndBatch`, `insertStock`, `updateStock`,
  `getStockSummaryCountsAndValue` (5 parallel COUNT queries + value sum),
  `searchMedicineStock` (2-step: medicine IDs → stock); `findAllPurchaseOrders`,
  `findPurchaseOrderById`, `insertPurchaseOrder`, `insertPurchaseOrderItems`,
  `updatePurchaseOrderItem`, `findPurchaseOrderItemsByPoId`, `updatePurchaseOrderStatus`,
  `getNextPONumber` (read-max pattern — acceptable for PO numbers, which fail closed on
  UNIQUE violation unlike bill numbers); `findBills` (paginated + DB-level search via
  ilike — fixes old code's client-side filter that broke accurate total counts),
  `nextBillNumber` (RPC call), `insertBill`, `insertBillItems`; `findPatientByPatientId`,
  `findLatestPrescriptionForPatient`, `findPendingPrescriptions`, `findBillsByPrescriptionIds`.
  `service.ts` implements all 21 functions. Key safety guarantees: `addStock` always
  increments quantity (never overwrites) when a batch already exists. `receivePurchaseOrder`
  always increments `PurchaseOrderItem.receivedQty` (never overwrites), upserts PharmacyStock
  same way. `createPharmacyBill` validates ALL stock quantities FIRST (Phase 1) before any
  write — prevents a bill existing without stock deducted if a mid-loop validation fails;
  stock deduction (Phase 3) uses the quantity snapshot from Phase 1. `getPharmacyBills`
  applies search filter at DB level (ilike) rather than client-side, making pagination
  totals accurate. `index.ts` not modified (no bugs found). `deno check` not run — Deno
  not installed in this environment. pharmacy module Status Summary Backend column: ⬜ → ✅.
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
- **2026-09-22** — Phase 7 Wave 3: `billing` module backend complete (5 endpoints).
  `repository.ts` implements `BillingRepository` with mandatory hospital_id scoping on every
  Prescription query (ADR-007); InvoiceItem and Payment are child tables with no hospital_id —
  ownership is validated via the parent Prescription before operating on them. Methods:
  `getDailySummary(dateStr)` (IST day bounds via `new Date('YYYY-MM-DDT00:00:00.000+05:30')`,
  aggregates total/amountPaid/balanceDue/discount on non-CANCELLED Prescriptions, counts unique
  patientIds), `listPrescriptions(opts)` (IST day bounds when dateStr provided, paginated by
  offset/limit, ordered prescriptionDate DESC), `getPrescriptionById(id)` (parallel fetch of
  Prescription + InvoiceItem + Payment), `findPrescription(id)` (hospital-scoped minimal select
  for ownership checks and math), `insertPayment(...)` (insert Payment row, returns full row),
  `updatePrescriptionAmounts(id, amountPaid, balanceDue)` (hospital-scoped UPDATE), `findPayment(payId)`
  (no hospital_id — child table; caller validates ownership via prescriptionId match + findPrescription),
  `deletePayment(payId)` (hard delete). `service.ts` implements all 5 service functions.
  `getDailySummary`: defaults date to today-in-IST via `now.getTime() + 5.5h` offset.
  Revenue definition confirmed from `analytics/repository.ts` line 530 and `analytics/actions.ts`
  line 294: `total` = totalBilled (revenue), `amountPaid` = totalCollected, `balanceDue` = totalDues.
  `listPrescriptions`: maps page/pageSize to offset/limit. `getPrescriptionById`: throws 404 if
  prescription missing or belongs to a different hospital. `recordPayment`: findPrescription
  (404 if missing) → insertPayment → updatePrescriptionAmounts (newAmountPaid = old + body.amount,
  newBalanceDue = max(0, total - newAmountPaid)). `voidPayment` (billing:delete permission, wired
  structurally in index.ts — no redundant admin-role check in service.ts): findPayment (404 if
  missing) → assert payment.prescriptionId === :id path param (404 if mismatch) → findPrescription
  hospital ownership check (404 if different hospital) → deletePayment → updatePrescriptionAmounts
  (newAmountPaid = max(0, old - voidedAmount), newBalanceDue = total - newAmountPaid). `index.ts`
  not modified — all 5 route wirings confirmed correct from Phase 6 scaffold. `types.ts` not
  modified — BillingDateQuerySchema/RecordPaymentSchema already correct. DB column names verified
  against `supabase-migration.sql` CREATE TABLE statements: Prescription fields `total`,
  `amountPaid`, `balanceDue`, `discount`, `prescriptionDate`; InvoiceItem fields `description`,
  `amount`, `unitPrice`, `quantity`, `sortOrder`; Payment fields `amount`, `paymentMode`,
  `paymentDate`, `receivedBy`, `paymentRef`. No invented field names. `deno check` not run —
  Deno not installed in this environment (same constraint as all prior modules). billing module
  Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 3: `optical` module backend complete (16 endpoints).
  `types.ts` corrected from scaffold's wrong field names to real DB column names:
  `isDeleted` → `isActive` on OpticalProductSchema (DB uses isActive for soft-delete, no isDeleted
  column); `batch` → `batchNumber` on OpticalStockSchema (DB column is "batchNumber"); `name` →
  `itemName` on OpticalBillItemSchema (DB column is "itemName"). OpticalProductSchema widened to
  include all real product catalog fields (type, material, color, size, coating, index, modelNumber,
  hsnCode, gstPercent). OpticalStockSchema widened to include mrp, gstPercent, supplierId, isActive.
  OpticalBillItemSchema widened to include category, eye, mrp, total, discountPercent, amount,
  gstPercent. CreateOpticalBillSchema rebuilt from scratch matching old createOpticalBill input shape
  (patientName required; patientId optional for walk-in sales; all financial/delivery/payment fields).
  OpticalBillListQuerySchema extended with dateFrom/dateTo/search/status optional filters.
  Response-side interfaces added: OpticalBillRow, OpticalBillItemRow, StockSummary, StockSearchResult,
  PatientArReading, OpticalSettings.
  `repository.ts` implements OpticalRepository with full hospital_id scoping on all entity tables
  (OpticalProduct, OpticalStock, OpticalBill, Patient): `listProducts`, `findProductById`,
  `insertProduct`, `updateProduct`, `softDeleteProduct` (isActive=false); `listStock`,
  `findExistingStock` (exact null-matching on batchNumber/power for UNIQUE key lookup),
  `insertStock`, `incrementStockQuantity`, `findStockById`, `updateStock`, `getStockSummary`
  (parallel count queries — total and lowStock), `searchStock` (in-process name/brand/model filter,
  maps to StockSearchResult); `listBills` (paginated, count: exact, optional date/status/search
  filters; in-process search post-fetch), `getNextBillNumber` (OPT-YYYYMMDD-NNNN sequential),
  `insertBill`, `insertBillItem` (no hospital_id — pure child table per 4-datamodel.md),
  `findBillById`, `updateBillStatus`, `decrementStockQuantity` (read-then-update pattern matching
  old code); `findPatientWithReadings` (eyeReadings+prescriptions nested join, hospital_id-scoped).
  HospitalProfile methods: `getHospitalProfile` uses .eq('id', this.hospitalId) — NOT a
  nonexistent hospital_id column (known bug from settings/doctor modules, avoided here).
  `updateHospitalProfileSettings` writes only the settings TEXT blob, also .eq('id', hospitalId).
  `service.ts` implements all 16 functions:
  `createProduct` (all optional fields defaulted, isActive=true, createdBy from session);
  `updateProduct`/`deleteProduct` (404 guard before patch/soft-delete);
  `upsertStock` — upsert key is (productId, batchNumber, power) with explicit null-matching;
  existing row → incrementStockQuantity (adds to existing quantity); no row → insertStock;
  `updateStock` (404 guard); `getStockSummary`, `searchStock` (2-char minimum matches old behavior);
  `getBills`, `createBill` (financials computed server-side: subtotal, gstAmount, discountAmount,
  netAmount, billAmount=Math.round(netAmount+roundOff), balanceDue; items and stock decrement in
  sequential loop); `updateBillStatus` (404 guard);
  `getPatientArReading` — ports old getPatientWithARReading exactly (sort by readingDate, filter
  prescriptions COMPLETED/DRAFT, safeParse JSON fields, returns null if patient not found);
  `getSettings`/`updateSettings` — read/write opticalPrintHeaderKey inside HospitalProfile.settings
  JSON blob (same pattern as PrintConfig/NavStyle in settings module; hospital_id bug avoided:
  getHospitalProfile uses .eq('id', hospitalId));
  `getHospitalProfile` — delegates to repo.getHospitalProfile() with correct .eq('id', hospitalId).
  `index.ts` not modified — all 16 route wirings and permission guards correct from Phase 6 scaffold.
  `deno check` not run — Deno not installed in this environment.
  optical module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 4: `reports` module backend complete (17 endpoints).
  **Schema corrections:** `ExportQuerySchema` extended with optional `search`, `patientType`, and
  `status` fields — these are used by the old `data/actions.ts` contract that the frontend sends
  but were absent from the scaffold's types.ts (silent data-loss bug). Not in openapi.yaml's
  parameter list, but included here to match the real contract.
  **Critical FK discovery:** verified against `db/create-hospital-db.sql` and the backfill
  migration that (a) `Prescription.patientId`, `EyeReading.patientId`, `LabBill.patientId` are all
  TEXT FKs to `Patient.patientId` (display ID, e.g. "P-2024-0001"), while (b) `InPatient.patientId`
  is a UUID FK to `Patient.id`. The openapi.yaml `{patientId}` parameter is the UUID. This means
  the service must call `findPatientById(uuid)` first to resolve the display patientId for
  Prescription/EyeReading/LabBill queries; InPatient is queried directly by UUID.
  **HospitalProfile bug avoided:** `getPatientReceipt` uses `.eq('id', this.hospitalId)` on
  HospitalProfile — not `.limit(1)` — matching the known fix from settings/doctor modules.
  **EyeReading hospital_id:** confirmed present (backfill migration), so export scopes directly
  via `hospital_id` without a Patient join.
  **Export limit/filtering matched:** all 9 export endpoints use `.limit(5000)` (exact match to
  old `data/actions.ts`). Date field per export: patients→appointmentDate, prescriptions→
  prescriptionDate, eye-readings→readingDate, inpatients→admissionDate, insurance-claims→createdAt,
  lab-bills→createdAt, pharmacy-bills→billDate, optical-bills→billDate, expenses→date.
  **Search semantics (reports vs other modules):** reports search returns broader result fields
  (age/gender/dateOfBirth/patientType/registeredOn/lastVisitDate) vs call-logs (phone/UHID only)
  and patient-care (page-context fields). Includes prescriptions nested for lastVisitDate. Short
  explicit query (< 2 chars) returns [] matching old behavior; missing q returns paginated list.
  `repository.ts` implements `ReportsRepository` with 18 methods covering patient search,
  cross-table ID resolution, all 8 patient-detail queries, and 9 export queries — every query
  scoped by `hospital_id` per ADR-007. `service.ts` implements all 17 functions with date-range
  resolution (mirrors analytics/service.ts pattern), patient 404 guard, and output shaping matching
  old code field-for-field. `index.ts` not modified (no bugs found). `deno check` not run —
  Deno not installed in this environment.
  reports module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Phase 7 Wave 4: `dashboard` module backend complete (2 endpoints). The old
  DashboardClient.tsx is pure navigation UI — no data fetching, so there was no old actions.ts
  to reference for parity. Data definitions were sourced from other already-implemented modules:
  `getTodaySummary` uses the IST-correct `istDayBounds` helper (same implementation as
  billing/repository.ts) for today's window; `getQuickStats` uses UTC midnight boundaries
  (matching analytics/service.ts's `resolveDateRange`). Revenue column names sourced directly
  from analytics/repository.ts: Prescription (total/amountPaid/balanceDue),
  PharmacyBill (billAmount/paidAmount/balanceDue), LabBill (total/amountPaid/balanceDue),
  OpticalBill (billAmount/paidAmount/balanceDue), InPatient (netAmount/totalReceivedAmount/
  balanceAmount). Status filters match analytics exactly: non-CANCELLED for Prescription,
  PharmacyBill, OpticalBill; no filter for LabBill; InPatient active count by
  `.neq('status', 'DISCHARGED')`. `pendingWorkup` (summary only) is approximate:
  max(0, newPatientsToday - eyeReadingsToday) using EyeReading.readingDate IST window;
  a precise per-patient workup join is the queue endpoint's responsibility.
  `repository.ts` implements `getTodaySummary` (8 parallel queries) and `getQuickStats`
  (13 parallel queries). `service.ts` implements two thin orchestrators.
  `index.ts` not modified — route wiring and permission guards correct from Phase 6 scaffold.
  `deno check` not run — Deno not installed in this environment.
  dashboard module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Caught a real gap after Waves 1-4 were otherwise "complete": ADR-004's wave
  table only names 18 of the 20 modules — `health` and `workup` were never assigned to any wave
  and had been sitting at ⬜ the whole time, unnoticed until this PROGRESS.md review. Implemented
  `health` directly (2 endpoints — liveness always returns ok; DB-health runs a lightweight
  `select(head:true,count:'exact')` against HospitalProfile and reports latency + degraded status
  on error). `workup` (4 endpoints) dispatched to a dedicated agent, following the already-verified
  3-parallel-query-merge pattern from the queue module's `/queue/workup` implementation.
- **2026-09-22** — Phase 7 catch-up: `workup` module backend complete (4 endpoints). Wave-plan
  omission (ADR-004 never assigned this module to a wave) caught during post-Wave-4 PROGRESS.md
  review and closed as a standalone session.
  `types.ts` corrected: scaffold had invented field names (`rightSphere`, `leftSphere`, etc.)
  that do not exist in the EyeReading table. Replaced with actual DB columns: `readingDate`
  (YYYY-MM-DD, upsert key), `autoRefractometer`, `glassesReading`, `previousPrescription`,
  `presentPrescription`, `clinicalFindings` — all TEXT (nullable), verified against
  supabase-migration.sql.
  `repository.ts` implements `WorkupRepository` with 6 methods: `getWorkupQueue` (3-parallel-query
  merge pattern identical to queue/repository.ts `getWorkupQueue` — appointment+prescription+
  eye-reading today, merge by patientId, A wins, nested relations filtered to today in-process,
  `computeStatus` inlined matching doctor/queue module implementations); `getPatientForWorkup`
  (single patient, hospital_id-scoped, nested EyeReading+Prescription filtered to today in-process);
  `findTodayEyeReading` (maybeSingle — determines upsert direction); `findUnlinkedPrescription`
  (2-query approach: today's prescriptions → EyeReading.prescriptionId IN those IDs → find first
  unclaimed; this actually works, unlike the old code's `.is("eyeReadingId", null)` filter on
  Prescription which referenced a non-existent column and silently failed — see note below);
  `insertEyeReading` (status always 'COMPLETED', hospital_id always set); `updateEyeReading`
  (records updatedBy). Every direct EyeReading/Prescription query scoped by hospital_id (ADR-007).
  `service.ts` implements all 4 functions:
  — `getWorkupQueue`: delegates to WorkupRepository.getWorkupQueue().
  — `getPatientForWorkup`: 404 via NotFoundError if patient not found or wrong hospital.
  — `saveEyeReading` (upsert): normalizes readingDate to IST YYYY-MM-DD, checks for existing
    eye reading → UPDATE if found, INSERT if not. On INSERT, calls `findUnlinkedPrescription`
    to link the new reading to today's first unlinked prescription (prescriptionId set on insert).
  — `startWorkup`: intentional no-op (deprecated, openapi.yaml deprecated: true).
  `index.ts` not modified (no bugs found — all 4 routes already correctly wired in Phase 6 scaffold).
  **Eye-reading-to-prescription linking fix:** The old Next.js code queried `.is("eyeReadingId", null)`
  on the Prescription table. `eyeReadingId` is not a DB column on Prescription (only EyeReading has
  `prescriptionId` FK to Prescription.id). PostgREST would return an error for this unknown column
  filter; the error was silently swallowed via destructuring only `{ data: todayPrescription }` —
  so `todayPrescription` was always null and prescriptions were never actually linked. The new
  implementation uses the correct two-query approach (prescriptions → EyeReading.prescriptionId IN
  ids → find first unclaimed) which will properly link readings to prescriptions going forward.
  `deno check` not run — Deno not installed in this environment (same constraint as all prior modules).
  workup module Status Summary Backend column: ⬜ → ✅.
- **2026-09-22** — Post-hoc review found one real gap in the workup module before commit:
  `updateEyeReading` had no `hospital_id` filter in its WHERE clause at all (unlike the
  `findUnlinkedPrescription` EyeReading read, which is safely transitively scoped via an
  already-hospital_id-filtered Prescription query). Confirmed EyeReading does carry `hospital_id`
  since the Phase 4 backfill migration, so there was no excuse for the omission. Fixed to add
  `.eq('hospital_id', this.hospitalId)`. This is the same class of gap as patient-care's
  `updatePrescriptionById` fix earlier in Wave 2 — repository methods must self-scope by
  hospital_id rather than relying on the id alone or on caller discipline.
