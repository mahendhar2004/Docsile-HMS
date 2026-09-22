import { z } from 'zod';

export const AnalyticsQuerySchema = z.object({
  filter: z.string().optional(),
  customStart: z.string().date().optional(),
  customEnd: z.string().date().optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
