/**
 * PatientCarePage — placeholder.
 *
 * Phase 7 TODO: Implement full patient-care module UI:
 * - OPD/IPD tabbed view (replaces src/app/(hospital)/patients + inpatients)
 * - Patient registration stepper (POST /patient-care/patients)
 * - In-patient admission form (POST /patient-care/inpatients)
 * - Date navigator, search, patient table (GET /patient-care/patients)
 * - Patient detail panel (GET /patient-care/patients/{id})
 * - Existing patient search (GET /patient-care/patients/search — cursor-based)
 * - Add services modal (POST /patient-care/patients/{id}/services)
 * - Print receipt (GET /patient-care/patients/{id}/receipt)
 * - Edit/delete patients + inpatients
 * - Status update, date move
 * Permissions: patients:*, inpatients:*
 */
export default function PatientCarePage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Patients</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: OPD + IPD patient management — registration, admission,
        discharge, billing, prescriptions, and receipts.
      </p>
    </main>
  )
}
