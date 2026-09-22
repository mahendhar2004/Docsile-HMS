/**
 * Types for the health module.
 * Health endpoints return simple status objects — no request body schemas needed.
 */

import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
});

export const DbHealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  latencyMs: z.number().int().nonnegative(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type DbHealthResponse = z.infer<typeof DbHealthResponseSchema>;
