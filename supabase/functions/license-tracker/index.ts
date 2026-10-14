/**
 * license-tracker Edge Function — 6 endpoints
 *
 * Routes — NOT openapi.yaml's planned `licenses:edit` for update/document
 * actions (that permission key exists in src/lib/permissions.ts's registry
 * but main's real src/app/(hospital)/license-tracker/actions.ts never checks
 * it anywhere). Main's actual server actions gate:
 *   GET    /license-tracker                  licenses:view
 *   POST   /license-tracker                  licenses:create
 *   PATCH  /license-tracker/:id              licenses:create  (updateLicense reuses create)
 *   DELETE /license-tracker/:id              licenses:delete
 *   PATCH  /license-tracker/:id/document     licenses:create  (saveLicenseDocumentUrl reuses create)
 *   DELETE /license-tracker/:id/document     licenses:delete  (removeLicenseDocument reuses delete)
 * A role with `licenses:create` but not a (main-nonexistent) `licenses:edit`
 * could create+upload in main but would 403 on the same actions here before
 * this fix — a real permission-mapping bug, not an intentional deviation.
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import { LicenseSchema, SaveDocumentUrlSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/license-tracker');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

app.get('/', requirePermission('licenses:view'), async (c) => ok(c, await service.listLicenses(c.get('session') as Session)));
app.post('/', requirePermission('licenses:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = LicenseSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid license: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createLicense(s, b.data), 'License created');
});
app.patch('/:id', requirePermission('licenses:create'), async (c) => {
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
app.patch('/:id/document', requirePermission('licenses:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = SaveDocumentUrlSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid document URL: ${b.error.errors[0].message}`, 400);
  await service.saveDocumentUrl(s, c.req.param('id'), b.data.documentUrl);
  return ok(c, null, 'Document URL saved');
});
app.delete('/:id/document', requirePermission('licenses:delete'), async (c) => {
  await service.removeDocument(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Document URL cleared');
});

Deno.serve(app.fetch);
