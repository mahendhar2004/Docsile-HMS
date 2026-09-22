import { z } from 'zod';

// dashboard module is read-only; no request body schemas needed
export const DashboardQuerySchema = z.object({
  date: z.string().date().optional(),
});
