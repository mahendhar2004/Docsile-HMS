/**
 * staff Edge Function — 12 endpoints
 *
 * Routes (openapi.yaml §staff):
 *   GET    /staff/members                     staff:view
 *   POST   /staff/members                     staff:create
 *   GET    /staff/members/:id                 staff:view
 *   PATCH  /staff/members/:id                 staff:edit
 *   PATCH  /staff/members/:id/active          staff:deactivate
 *   POST   /staff/members/:id/reset-password  staff:edit
 *   GET    /staff/roles                       staff:view
 *   POST   /staff/roles/seed                  staff:manage_roles  (static — before /:id)
 *   POST   /staff/roles                       staff:manage_roles
 *   PATCH  /staff/roles/:id                   staff:manage_roles
 *   DELETE /staff/roles/:id                   staff:manage_roles
 *   PATCH  /staff/roles/:id/permissions       staff:manage_roles
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  ToggleActiveSchema,
  ResetPasswordSchema,
  RoleSchema,
  UpdatePermissionsSchema,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/staff');
app.use('*', requireAuth);
app.onError(handleError);

// ---- Members ----
app.get('/members', requirePermission('staff:view'), async (c) => ok(c, await service.listMembers(c.get('session') as Session)));
app.post('/members', requirePermission('staff:create'), async (c) => {
  const s = c.get('session') as Session;
  const b = CreateStaffSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid member: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createMember(s, b.data), 'Staff member created');
});
app.get('/members/:id', requirePermission('staff:view'), async (c) => ok(c, await service.getMemberById(c.get('session') as Session, c.req.param('id'))));
app.patch('/members/:id', requirePermission('staff:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdateStaffSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid member: ${b.error.errors[0].message}`, 400);
  await service.updateMember(s, c.req.param('id'), b.data);
  return ok(c, null, 'Staff member updated');
});
app.patch('/members/:id/active', requirePermission('staff:deactivate'), async (c) => {
  const s = c.get('session') as Session;
  const b = ToggleActiveSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid request: ${b.error.errors[0].message}`, 400);
  await service.toggleActive(s, c.req.param('id'), b.data.isActive);
  return ok(c, null, 'Active status updated');
});
app.post('/members/:id/reset-password', requirePermission('staff:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ResetPasswordSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid request: ${b.error.errors[0].message}`, 400);
  await service.resetPassword(s, c.req.param('id'), b.data.newPassword);
  return ok(c, null, 'Password reset successfully');
});

// ---- Roles — static /roles/seed before /roles/:id ----
app.get('/roles', requirePermission('staff:view'), async (c) => ok(c, await service.listRoles(c.get('session') as Session)));
app.post('/roles/seed', requirePermission('staff:manage_roles'), async (c) => {
  await service.seedSystemRoles(c.get('session') as Session);
  return ok(c, null, 'System roles seeded');
});
app.post('/roles', requirePermission('staff:manage_roles'), async (c) => {
  const s = c.get('session') as Session;
  const b = RoleSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid role: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createRole(s, b.data), 'Role created');
});
app.patch('/roles/:id', requirePermission('staff:manage_roles'), async (c) => {
  const s = c.get('session') as Session;
  const b = RoleSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid role: ${b.error.errors[0].message}`, 400);
  await service.updateRole(s, c.req.param('id'), b.data);
  return ok(c, null, 'Role updated');
});
app.delete('/roles/:id', requirePermission('staff:manage_roles'), async (c) => {
  await service.deleteRole(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Role deleted');
});
app.patch('/roles/:id/permissions', requirePermission('staff:manage_roles'), async (c) => {
  const s = c.get('session') as Session;
  const b = UpdatePermissionsSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid permissions: ${b.error.errors[0].message}`, 400);
  await service.updateRolePermissions(s, c.req.param('id'), b.data.permissions);
  return ok(c, null, 'Permissions updated');
});

export default app.fetch;
