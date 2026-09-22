/**
 * labs Edge Function — 14 endpoints
 *
 * Routes (openapi.yaml §labs):
 *   GET    /labs/labs                              labs:view
 *   POST   /labs/labs                              labs:config
 *   GET    /labs/labs/:id                          labs:view
 *   PATCH  /labs/labs/:id                          labs:config
 *   DELETE /labs/labs/:id                          labs:config
 *   GET    /labs/labs/:labId/investigations        labs:view
 *   PUT    /labs/labs/:labId/investigations        labs:config
 *   GET    /labs/investigations                    labs:view
 *   POST   /labs/investigations                    labs:config
 *   GET    /labs/patients/:patientId/investigations labs:view
 *   GET    /labs/pending-investigations            labs:view
 *   GET    /labs/bills                             labs:view
 *   POST   /labs/bills                             labs:create
 *   GET    /labs/bills/:id                         labs:view
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { LabSchema, InvestigationMasterSchema, CreateLabBillsSchema, UpdateLabInvestigationsSchema, LabBillListQuerySchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/labs');
app.use('*', requireAuth);
app.onError(handleError);

// ---- Labs — static routes before :id ----
app.get('/labs', requirePermission('labs:view'), async (c) => ok(c, await service.getLabs(c.get('session') as Session)));
app.post('/labs', requirePermission('labs:config'), async (c) => {
  const s = c.get('session') as Session;
  const b = LabSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid lab: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createLab(s, b.data), 'Lab created');
});
app.get('/labs/:id', requirePermission('labs:view'), async (c) => ok(c, await service.getLabById(c.get('session') as Session, c.req.param('id'))));
app.patch('/labs/:id', requirePermission('labs:config'), async (c) => {
  const s = c.get('session') as Session;
  const b = LabSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid lab: ${b.error.errors[0].message}`, 400);
  await service.updateLab(s, c.req.param('id'), b.data);
  return ok(c, null, 'Lab updated');
});
app.delete('/labs/:id', requirePermission('labs:config'), async (c) => {
  await service.deleteLab(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Lab soft-deleted');
});
app.get('/labs/:labId/investigations', requirePermission('labs:view'), async (c) => ok(c, await service.getLabInvestigations(c.get('session') as Session, c.req.param('labId'))));
app.put('/labs/:labId/investigations', requirePermission('labs:config'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdateLabInvestigationsSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid investigations: ${b.error.errors[0].message}`, 400);
  await service.updateLabInvestigations(s, c.req.param('labId'), b.data.investigationIds);
  return ok(c, null, 'Lab investigations replaced');
});

// ---- Investigations master ----
app.get('/investigations', requirePermission('labs:view'), async (c) => ok(c, await service.getAllInvestigations(c.get('session') as Session)));
app.post('/investigations', requirePermission('labs:config'), async (c) => {
  const s = c.get('session') as Session;
  const b = InvestigationMasterSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid investigation: ${b.error.errors[0].message}`, 400);
  await service.createInvestigation(s, b.data);
  return created(c, null, 'Investigation created');
});

// ---- Patient investigations ----
app.get('/patients/:patientId/investigations', requirePermission('labs:view'), async (c) => ok(c, await service.getPatientInvestigations(c.get('session') as Session, c.req.param('patientId'))));

// ---- Pending ----
app.get('/pending-investigations', requirePermission('labs:view'), async (c) => ok(c, await service.getPendingLabInvestigations(c.get('session') as Session)));

// ---- Bills — static routes before :id ----
app.get('/bills', requirePermission('labs:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = LabBillListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getLabBills(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.post('/bills', requirePermission('labs:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = CreateLabBillsSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid bills: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createLabBills(s, b.data), 'Lab bills created');
});
app.get('/bills/:id', requirePermission('labs:view'), async (c) => ok(c, await service.getLabBillById(c.get('session') as Session, c.req.param('id'))));

export default app.fetch;
