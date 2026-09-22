/**
 * DoctorPage — placeholder.
 *
 * Phase 7 TODO: Implement doctor module UI:
 * - Doctor queue view (GET /doctor/queue)
 * - Patient consultation (GET /doctor/patients/{id}/consultation)
 * - Save prescription / upsert (POST /doctor/patients/{id}/prescriptions)
 * - Reference data: medicines, investigations, templates (GET /doctor/*)
 * - Dropdown options (GET/POST /doctor/dropdown-options)
 * - Create medicine from doctor context (POST /doctor/medicines)
 * - Receipt data for print (GET /doctor/patients/{id}/receipt)
 * - AI assist (Sitha AI context via shared kernel)
 * Permissions: doctor:view, doctor:consult, doctor:edit, billing:view
 */
export default function DoctorPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Doctor</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Doctor consultation view — queue, prescription writing,
        AI assist, and receipt printing.
      </p>
    </main>
  )
}
