/**
 * analytics Edge Function — 19 endpoints
 *
 * All routes require reports:view.
 * All routes accept query params: filter, customStart, customEnd.
 * Rate limit: 30 req/min per user (enforced by Supabase/gateway).
 *
 * Routes (openapi.yaml §analytics):
 *   GET /analytics/overview
 *   GET /analytics/gender-distribution
 *   GET /analytics/age-distribution
 *   GET /analytics/revenue-by-category
 *   GET /analytics/time-series
 *   GET /analytics/top-services
 *   GET /analytics/expense-breakdown
 *   GET /analytics/financial-summary
 *   GET /analytics/payment-mode-breakdown
 *   GET /analytics/doctor-performance
 *   GET /analytics/status-distribution
 *   GET /analytics/common-diagnoses
 *   GET /analytics/common-medicines
 *   GET /analytics/top-prescribed-investigations
 *   GET /analytics/top-pharmacy-sales
 *   GET /analytics/top-lab-tests
 *   GET /analytics/referral-stats
 *   GET /analytics/surgery-breakdown
 *   GET /analytics/region-stats
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { AnalyticsQuerySchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/analytics');
app.use('*', requireAuth);
app.use('*', requirePermission('reports:view'));
app.onError(handleError);

app.get('/overview', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getOverview(c.get('session') as Session, q.data));
});
app.get('/gender-distribution', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getGenderDistribution(c.get('session') as Session, q.data));
});
app.get('/age-distribution', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getAgeDistribution(c.get('session') as Session, q.data));
});
app.get('/revenue-by-category', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getRevenueByCategory(c.get('session') as Session, q.data));
});
app.get('/time-series', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getTimeSeries(c.get('session') as Session, q.data));
});
app.get('/top-services', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getTopServices(c.get('session') as Session, q.data));
});
app.get('/expense-breakdown', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getExpenseBreakdown(c.get('session') as Session, q.data));
});
app.get('/financial-summary', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getFinancialSummary(c.get('session') as Session, q.data));
});
app.get('/payment-mode-breakdown', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getPaymentModeBreakdown(c.get('session') as Session, q.data));
});
app.get('/doctor-performance', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getDoctorPerformance(c.get('session') as Session, q.data));
});
app.get('/status-distribution', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getStatusDistribution(c.get('session') as Session, q.data));
});
app.get('/common-diagnoses', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getCommonDiagnoses(c.get('session') as Session, q.data));
});
app.get('/common-medicines', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getCommonMedicines(c.get('session') as Session, q.data));
});
app.get('/top-prescribed-investigations', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getTopPrescribedInvestigations(c.get('session') as Session, q.data));
});
app.get('/top-pharmacy-sales', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getTopPharmacySales(c.get('session') as Session, q.data));
});
app.get('/top-lab-tests', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getTopLabTests(c.get('session') as Session, q.data));
});
app.get('/referral-stats', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getReferralStats(c.get('session') as Session, q.data));
});
app.get('/surgery-breakdown', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getSurgeryBreakdown(c.get('session') as Session, q.data));
});
app.get('/region-stats', async (c) => {
  const q = AnalyticsQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  return ok(c, await service.getRegionStats(c.get('session') as Session, q.data));
});

export default app.fetch;
