/**
 * BillingPage — placeholder.
 *
 * Phase 7 TODO: Implement billing module UI:
 * - Daily billing summary (GET /billing/daily)
 * - Prescriptions list with amounts and payments (GET /billing/prescriptions)
 * - Prescription detail (GET /billing/prescriptions/{id})
 * - Record additional payment (POST /billing/prescriptions/{id}/payments)
 * - Void a payment (DELETE /billing/prescriptions/{id}/payments/{payId})
 * Permissions: billing:view, billing:create, billing:delete
 */
export default function BillingPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Billing</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Daily billing summary, prescriptions, payments, and receipt management.
      </p>
    </main>
  )
}
