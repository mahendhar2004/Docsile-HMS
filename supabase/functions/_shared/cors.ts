/**
 * Shared CORS middleware for all Edge Functions.
 *
 * The frontend calls these functions cross-origin (Vercel-hosted SPA ->
 * *.supabase.co) using `credentials: 'include'` for the session cookie, so
 * every function needs to both answer CORS preflight (OPTIONS) requests and
 * echo back the request's own Origin (wildcard "*" is invalid together with
 * credentialed requests per the Fetch spec).
 */

import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin) => origin,
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  credentials: true,
});
