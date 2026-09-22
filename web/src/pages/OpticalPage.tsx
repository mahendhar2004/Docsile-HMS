/**
 * OpticalPage — placeholder.
 *
 * Phase 7 TODO: Implement optical module UI:
 * - Product CRUD (/optical/products)
 * - Stock management (/optical/stock)
 * - Stock summary and search
 * - Optical bills (GET/POST /optical/bills, PATCH status)
 * - Patient AR reading (GET /optical/patients/{id}/ar-reading)
 * - Optical settings (GET/PATCH /optical/settings)
 * - Hospital profile for receipts (GET /optical/hospital-profile)
 * Permissions: optical:view, optical:manage, optical:create, optical:edit
 */
export default function OpticalPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Optical</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Optical products, stock, billing, and AR reading management.
      </p>
    </main>
  )
}
