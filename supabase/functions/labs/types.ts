import { z } from 'zod';

export const LabSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  printHeaderKey: z.string().nullable().optional(),
  isDeleted: z.boolean().optional(),
});
export type Lab = z.infer<typeof LabSchema>;

export const InvestigationMasterSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.string().nullable().optional(),
});
export type InvestigationMaster = z.infer<typeof InvestigationMasterSchema>;

export const LabBillItemSchema = z.object({
  id: z.string().uuid().optional(),
  labBillId: z.string().optional(),
  investigationId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
});

export const LabPaymentSchema = z.object({
  id: z.string().uuid().optional(),
  labBillId: z.string().optional(),
  paymentMode: z.string().min(1),
  amount: z.number().positive(),
  createdAt: z.string().datetime().optional(),
});

export const LabBillSchema = z.object({
  id: z.string().uuid().optional(),
  billNumber: z.string().optional(),
  patientId: z.string().min(1),
  labId: z.string().min(1),
  prescriptionId: z.string().nullable().optional(),
  totalAmount: z.number().nonnegative(),
  createdAt: z.string().datetime().optional(),
});

export const CreateLabBillsSchema = z.object({
  bills: z.array(z.object({
    bill: LabBillSchema,
    items: z.array(LabBillItemSchema),
    payment: LabPaymentSchema.optional(),
  })),
});

export const UpdateLabInvestigationsSchema = z.object({
  investigationIds: z.array(z.string().min(1)),
});

export const LabBillListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  date: z.string().date().optional(),
});
