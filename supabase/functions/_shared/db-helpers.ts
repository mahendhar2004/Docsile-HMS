/**
 * This schema was ported from a Prisma-managed database (db/create-hospital-db.sql).
 * Prisma always generated `id` (cuid) and `updatedAt` in the application layer, so
 * none of these tables have a DEFAULT for either column — every INSERT must supply
 * both explicitly, or Postgres rejects it with "null value in column ... violates
 * not-null constraint". Two tables added directly in Supabase (token_revocation,
 * and CallLog/InpatientTemplate before that) already have DB-side defaults or don't
 * use this id/updatedAt shape at all — do not route their inserts through this helper.
 */
export function withTimestamps<T extends Record<string, unknown>>(
  row: T,
): T & { id: string; updatedAt: string } {
  return { id: crypto.randomUUID(), updatedAt: new Date().toISOString(), ...row };
}

/** For the few Prisma-ported tables that have `id` but no `updatedAt` column at all
 * (InvoiceItem, Payment, DropdownOption, LabInvestigation, LabBillItem, LabPayment,
 * PurchaseOrderItem, PharmacyBillItem, OpticalBillItem) — using withTimestamps on
 * these would fail with "column updatedAt does not exist". */
export function withId<T extends Record<string, unknown>>(row: T): T & { id: string } {
  return { id: crypto.randomUUID(), ...row };
}
