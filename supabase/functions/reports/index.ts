/**
 * reports Edge Function — 17 endpoints
 *
 * Routes (openapi.yaml §reports):
 *   GET /reports/patients/search                    reports:view   (static — before /:patientId)
 *   GET /reports/patients/:patientId/summary        reports:view
 *   GET /reports/patients/:patientId/visits         reports:view
 *   GET /reports/patients/:patientId/prescriptions  reports:view
 *   GET /reports/patients/:patientId/inpatient      reports:view
 *   GET /reports/patients/:patientId/receipt        reports:view
 *   GET /reports/patients/:patientId/labs           reports:view
 *   GET /reports/patients/:patientId/billing        reports:view
 *   GET /reports/exports/patients                   data:export
 *   GET /reports/exports/prescriptions              data:export
 *   GET /reports/exports/eye-readings               data:export
 *   GET /reports/exports/inpatients                 data:export
 *   GET /reports/exports/insurance-claims           data:export
 *   GET /reports/exports/lab-bills                  data:export
 *   GET /reports/exports/pharmacy-bills             data:export
 *   GET /reports/exports/optical-bills              data:export
 *   GET /reports/exports/expenses                   data:export
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import { PatientSearchQuerySchema, ExportQuerySchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/reports');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

// ---- Patient search — static route before /:patientId ----
app.get('/patients/search', requirePermission('reports:view'), async (c) => {
  const q = PatientSearchQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.searchPatients(c.get('session') as Session, q.data));
});

// ---- Patient-specific report routes ----
app.get('/patients/:patientId/summary', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientSummary(c.get('session') as Session, c.req.param('patientId'))));
app.get('/patients/:patientId/visits', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientVisits(c.get('session') as Session, c.req.param('patientId'))));
app.get('/patients/:patientId/prescriptions', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientPrescriptions(c.get('session') as Session, c.req.param('patientId'))));
app.get('/patients/:patientId/inpatient', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientInpatient(c.get('session') as Session, c.req.param('patientId'))));
app.get('/patients/:patientId/receipt', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientReceipt(c.get('session') as Session, c.req.param('patientId'))));
app.get('/patients/:patientId/labs', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientLabs(c.get('session') as Session, c.req.param('patientId'))));
app.get('/patients/:patientId/billing', requirePermission('reports:view'), async (c) => ok(c, await service.getPatientBilling(c.get('session') as Session, c.req.param('patientId'))));

// ---- Exports — all require data:export ----
app.get('/exports/patients', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportPatients(c.get('session') as Session, q.data));
});
app.get('/exports/prescriptions', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportPrescriptions(c.get('session') as Session, q.data));
});
app.get('/exports/eye-readings', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportEyeReadings(c.get('session') as Session, q.data));
});
app.get('/exports/inpatients', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportInpatients(c.get('session') as Session, q.data));
});
app.get('/exports/insurance-claims', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportInsuranceClaims(c.get('session') as Session, q.data));
});
app.get('/exports/lab-bills', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportLabBills(c.get('session') as Session, q.data));
});
app.get('/exports/pharmacy-bills', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportPharmacyBills(c.get('session') as Session, q.data));
});
app.get('/exports/optical-bills', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportOpticalBills(c.get('session') as Session, q.data));
});
app.get('/exports/expenses', requirePermission('data:export'), async (c) => {
  const q = ExportQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.exportExpenses(c.get('session') as Session, q.data));
});

Deno.serve(app.fetch);
