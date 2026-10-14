import { z } from 'zod';

// ---- Lab ---------------------------------------------------------------
export const LabSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  printHeaderKey: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type Lab = z.infer<typeof LabSchema>;

// ---- InvestigationMaster ------------------------------------------------
export const InvestigationMasterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type InvestigationMaster = z.infer<typeof InvestigationMasterSchema>;

// ---- LabBillItem (input) ------------------------------------------------
// DB column is `amount`, not `price` — scaffold had it wrong.
export const LabBillItemSchema = z.object({
  id: z.string().uuid().optional(),
  labBillId: z.string().optional(),
  investigationId: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().nonnegative(),
});

// ---- LabPayment (input) -------------------------------------------------
export const LabPaymentSchema = z.object({
  id: z.string().uuid().optional(),
  labBillId: z.string().optional(),
  paymentMode: z.string().min(1),
  amount: z.number().positive(),
  createdAt: z.string().datetime().optional(),
});

// ---- LabBill (input) ----------------------------------------------------
// DB column is `total`, not `totalAmount`.  discount/discountReason are optional
// extras that the service uses to persist the full billing picture.
export const LabBillSchema = z.object({
  id: z.string().uuid().optional(),
  billNumber: z.string().optional(),
  patientId: z.string().min(1),
  labId: z.string().min(1),
  prescriptionId: z.string().nullable().optional(),
  total: z.number().nonnegative(),
  discount: z.number().nonnegative().optional(),
  discountReason: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

// ---- CreateLabBills (multi-bill) ----------------------------------------
// One request can create MULTIPLE LabBill rows — one per lab/entry in `bills`.
// Each entry bundles the bill header, its line items, and an optional payment.
export const CreateLabBillsSchema = z.object({
  bills: z.array(z.object({
    bill: LabBillSchema,
    items: z.array(LabBillItemSchema),
    payment: LabPaymentSchema.optional(),
  })),
});

// ---- UpdateLabInvestigations (replace-all) --------------------------------
// Carries per-investigation amount/isDefault — the old Next.js code accepted
// {investigationId, amount, isDefault}[], not a flat id list. Found and fixed
// post-Phase-5 (see repository.ts's replaceLabInvestigations jsdoc).
export const UpdateLabInvestigationsSchema = z.object({
  investigations: z.array(z.object({
    investigationId: z.string().min(1),
    amount: z.number().min(0),
    isDefault: z.boolean(),
  })),
});

// ---- LabBillListQuery ---------------------------------------------------
// dateFrom/dateTo/labId/status/patientId match the real filter set on main's
// Lab Bills History panel (src/app/(hospital)/labs/components/LabBillingTab.tsx
// loadHistory) — `date` (single day) is kept for back-compat with any existing
// caller, but the frontend history panel now uses the range + extra filters.
export const LabBillListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  date: z.string().date().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  labId: z.string().optional(),
  status: z.string().optional(),
  patientId: z.string().optional(),
});
