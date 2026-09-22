/**
 * PharmacyPage — placeholder.
 *
 * Phase 7 TODO: Implement pharmacy module UI:
 * - Medicine master (GET/POST/PATCH/DELETE /pharmacy/medicines)
 * - Stock management (GET/POST/PATCH /pharmacy/stock)
 * - Stock summary and search
 * - Suppliers CRUD (/pharmacy/suppliers)
 * - Purchase orders (/pharmacy/purchase-orders)
 * - Pharmacy bills (GET/POST /pharmacy/bills)
 * - Pending medicines (GET /pharmacy/pending-medicines)
 * - Patient prescription lookup (GET /pharmacy/patients/{id}/prescription)
 * Permissions: pharmacy:view, pharmacy:create, pharmacy:manage_stock, pharmacy:purchase_orders
 */
export default function PharmacyPage() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold text-foreground">Pharmacy</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Phase 7 TODO: Medicine stock, suppliers, purchase orders, billing, and dispensing.
      </p>
    </main>
  )
}
