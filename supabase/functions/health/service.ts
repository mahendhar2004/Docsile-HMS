/**
 * Business logic stubs for the health module.
 */

import { NotImplementedError } from '../_shared/errors.ts';
import type { HealthResponse, DbHealthResponse } from './types.ts';

export async function getLiveness(): Promise<HealthResponse> {
  throw new NotImplementedError('health.getLiveness — Phase 7');
}

export async function getDbHealth(): Promise<DbHealthResponse> {
  throw new NotImplementedError('health.getDbHealth — Phase 7');
}
