/**
 * insurance Edge Function — 11 endpoints
 *
 * Routes (openapi.yaml §insurance):
 *   GET    /insurance/companies              insurance:view
 *   POST   /insurance/companies              insurance:edit
 *   PATCH  /insurance/companies/:id          insurance:edit
 *   DELETE /insurance/companies/:id          insurance:edit
 *   GET    /insurance/claims                 insurance:view
 *   POST   /insurance/claims                 insurance:create
 *   GET    /insurance/claims/:id             insurance:view
 *   PATCH  /insurance/claims/:id/status      insurance:edit
 *   PATCH  /insurance/claims/:id/details     insurance:edit
 *   POST   /insurance/claims/:id/payments    insurance:edit
 *   GET    /insurance/inpatients/search      insurance:view
 *
 * Note: /insurance/companies/all was merged into GET /insurance/companies?paginated=false
 * (openapi.yaml §insurance description; reduces path count from 12 to 11).
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import {
  InsuranceCompanySchema,
  InsuranceClaimSchema,
  UpdateClaimStatusSchema,
  UpdateClaimDetailsSchema,
  AddClaimPaymentSchema,
  CompanyListQuerySchema,
  ClaimListQuerySchema,
  type UpdateClaimStatus,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/insurance');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

// ---- Companies ----
app.get('/companies', requirePermission('insurance:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = CompanyListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getCompanies(s, q.data);
  if (!q.data.paginated) return ok(c, data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.post('/companies', requirePermission('insurance:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = InsuranceCompanySchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid company: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createCompany(s, b.data), 'Insurance company created');
});
app.patch('/companies/:id', requirePermission('insurance:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = InsuranceCompanySchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid company: ${b.error.errors[0].message}`, 400);
  await service.updateCompany(s, c.req.param('id'), b.data);
  return ok(c, null, 'Company updated');
});
app.delete('/companies/:id', requirePermission('insurance:edit'), async (c) => {
  await service.deleteCompany(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Company soft-deleted');
});

// ---- Claims ----
app.get('/claims', requirePermission('insurance:view'), async (c) => {
  const s = c.get('session') as Session;
  const q = ClaimListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.getClaims(s, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});
app.post('/claims', requirePermission('insurance:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = InsuranceClaimSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid claim: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createClaim(s, b.data), 'Claim created');
});
app.get('/claims/:id', requirePermission('insurance:view'), async (c) => ok(c, await service.getClaimById(c.get('session') as Session, c.req.param('id'))));
app.patch('/claims/:id/status', requirePermission('insurance:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdateClaimStatusSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid status: ${b.error.errors[0].message}`, 400);
  // Bug fix: pass full b.data (not just b.data.status) so the service can use
  // optional financial fields (amount, notes, rejectionReason, settlementReference,
  // deductions) needed for SETTLED/PREAUTH_APPROVED/rejection status transitions.
  await service.updateClaimStatus(s, c.req.param('id'), b.data as UpdateClaimStatus);
  return ok(c, null, 'Claim status updated');
});
app.patch('/claims/:id/details', requirePermission('insurance:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdateClaimDetailsSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid details: ${b.error.errors[0].message}`, 400);
  await service.updateClaimDetails(s, c.req.param('id'), b.data);
  return ok(c, null, 'Claim details updated');
});
app.post('/claims/:id/payments', requirePermission('insurance:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = AddClaimPaymentSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid payment: ${b.error.errors[0].message}`, 400);
  await service.addClaimPayment(s, c.req.param('id'), b.data);
  return created(c, null, 'Payment recorded');
});

// ---- Inpatients search (for claim creation) ----
app.get('/inpatients/search', requirePermission('insurance:view'), async (c) => ok(c, await service.searchInpatients(c.get('session') as Session, c.req.query('q'))));

Deno.serve(app.fetch);
