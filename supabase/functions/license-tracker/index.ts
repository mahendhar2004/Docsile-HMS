/**
 * license-tracker Edge Function — 6 endpoints
 *
 * Routes (openapi.yaml §license-tracker):
 *   GET    /license-tracker                  licenses:view
 *   POST   /license-tracker                  licenses:create
 *   PATCH  /license-tracker/:id              licenses:edit
 *   DELETE /license-tracker/:id              licenses:delete
 *   PATCH  /license-tracker/:id/document     licenses:edit
 *   DELETE /license-tracker/:id/document     licenses:edit
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { LicenseSchema, SaveDocumentUrlSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/license-tracker');
app.use('*', requireAuth);
app.onError(handleError);

app.get('/', requirePermission('licenses:view'), async (c) => ok(c, await service.listLicenses(c.get('session') as Session)));
app.post('/', requirePermission('licenses:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = LicenseSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid license: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createLicense(s, b.data), 'License created');
});
app.patch('/:id', requirePermission('licenses:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = LicenseSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid license: ${b.error.errors[0].message}`, 400);
  await service.updateLicense(s, c.req.param('id'), b.data);
  return ok(c, null, 'License updated');
});
app.delete('/:id', requirePermission('licenses:delete'), async (c) => {
  await service.deleteLicense(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'License deleted');
});
app.patch('/:id/document', requirePermission('licenses:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = SaveDocumentUrlSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid document URL: ${b.error.errors[0].message}`, 400);
  await service.saveDocumentUrl(s, c.req.param('id'), b.data.documentUrl);
  return ok(c, null, 'Document URL saved');
});
app.delete('/:id/document', requirePermission('licenses:edit'), async (c) => {
  await service.removeDocument(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Document URL cleared');
});

export default app.fetch;
