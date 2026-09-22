import { z } from 'zod';

// queue module reads from multiple tables; no owned writable schemas
export const QueueQuerySchema = z.object({
  date: z.string().date().optional(),
});
