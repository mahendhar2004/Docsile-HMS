/**
 * Response envelope helpers for docsile-hms Edge Functions.
 *
 * Every response — success or error — is wrapped in the ApiResponse envelope defined in
 * openapi.yaml:
 *   { statusCode, message, data, meta? }
 *
 * `meta` is included only for paginated responses. Error responses set `data: null`.
 */

import type { Context } from 'hono';
import { AppError } from './errors.ts';

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T | null;
  meta?: PaginatedMeta;
}

/** Build and send a successful JSON response. */
export function ok<T>(
  c: Context,
  data: T,
  message = 'Success',
  status = 200,
): Response {
  const body: ApiResponse<T> = { statusCode: status, message, data };
  return c.json(body, status as 200);
}

/** Build and send a 201-Created JSON response. */
export function created<T>(c: Context, data: T, message = 'Created'): Response {
  const body: ApiResponse<T> = { statusCode: 201, message, data };
  return c.json(body, 201);
}

/** Build and send a paginated JSON response. */
export function paginated<T>(
  c: Context,
  data: T[],
  meta: PaginatedMeta,
  message = 'Success',
): Response {
  const body: ApiResponse<T[]> = { statusCode: 200, message, data, meta };
  return c.json(body, 200);
}

/** Build and send an error JSON response. */
export function errorResponse(c: Context, message: string, statusCode: number): Response {
  const body: ApiResponse<null> = { statusCode, message, data: null };
  return c.json(body, statusCode as 400);
}

/**
 * Global Hono error handler — catches AppError subclasses and unknown errors,
 * and converts them to the standard envelope. Register with `app.onError(handleError)`.
 */
export function handleError(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    return errorResponse(c, err.message, err.statusCode);
  }
  // Unknown / unhandled error — log and return 500
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message: 'Unhandled error',
    error: err.message,
    stack: err.stack,
  }));
  return errorResponse(c, 'An unexpected error occurred. Please try again or contact support.', 500);
}
