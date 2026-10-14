/**
 * settings Edge Function — 33 endpoints
 *
 * Routes (openapi.yaml §settings):
 *   GET    /settings/service-templates               settings:view
 *   POST   /settings/service-templates               settings:edit
 *   PATCH  /settings/service-templates/:id           settings:edit
 *   DELETE /settings/service-templates/:id           settings:edit
 *   GET    /settings/hospital-profile                settings:view
 *   PATCH  /settings/hospital-profile                settings:edit
 *   GET    /settings/print-config                    settings:view
 *   PATCH  /settings/print-config                    settings:edit
 *   PATCH  /settings/nav-style                       settings:edit
 *   GET    /settings/prescription-templates          settings:view
 *   POST   /settings/prescription-templates          settings:edit
 *   PATCH  /settings/prescription-templates/:id      settings:edit
 *   DELETE /settings/prescription-templates/:id      settings:edit
 *   GET    /settings/inpatient-templates             settings:view
 *   POST   /settings/inpatient-templates             settings:edit
 *   PATCH  /settings/inpatient-templates/:id         settings:edit
 *   DELETE /settings/inpatient-templates/:id         settings:edit
 *   GET    /settings/packages                        settings:view
 *   POST   /settings/packages                        settings:edit
 *   PATCH  /settings/packages/:id                    settings:edit
 *   DELETE /settings/packages/:id                    settings:edit
 *   GET    /settings/surgeries                       settings:view
 *   POST   /settings/surgeries                       settings:edit
 *   PATCH  /settings/surgeries/:id                   settings:edit
 *   DELETE /settings/surgeries/:id                   settings:edit
 *   GET    /settings/discharges                      settings:view
 *   POST   /settings/discharges                      settings:edit
 *   PATCH  /settings/discharges/:id                  settings:edit
 *   DELETE /settings/discharges/:id                  settings:edit
 *   GET    /settings/medicine-master                 settings:view
 *   POST   /settings/medicine-master                 settings:edit
 *   PATCH  /settings/medicine-master/:id             settings:edit
 *   DELETE /settings/medicine-master/:id             settings:edit
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import {
  ServiceTemplateSchema,
  HospitalProfileSchema,
  NavStyleSchema,
  PredefinedTemplateSchema,
  InpatientTemplateSchema,
  PredefinedPackageSchema,
  PredefinedSurgerySchema,
  PredefinedDischargeSchema,
  MedicineMasterSchema,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/settings');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

// ---- Service templates ----
app.get('/service-templates', requirePermission('settings:view'), async (c) => ok(c, await service.listServiceTemplates(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/service-templates', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ServiceTemplateSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid template: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createServiceTemplate(s, b.data), 'Service template created');
});
app.patch('/service-templates/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = ServiceTemplateSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid template: ${b.error.errors[0].message}`, 400);
  await service.updateServiceTemplate(s, c.req.param('id'), b.data);
  return ok(c, null, 'Service template updated');
});
app.delete('/service-templates/:id', requirePermission('settings:edit'), async (c) => {
  await service.deleteServiceTemplate(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Service template deleted');
});

// ---- Hospital profile ----
app.get('/hospital-profile', requirePermission('settings:view'), async (c) => ok(c, await service.getHospitalProfile(c.get('session') as Session)));
app.patch('/hospital-profile', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = HospitalProfileSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid profile: ${b.error.errors[0].message}`, 400);
  await service.updateHospitalProfile(s, b.data);
  return ok(c, null, 'Hospital profile updated');
});

// ---- Print config ----
app.get('/print-config', requirePermission('settings:view'), async (c) => ok(c, await service.getPrintConfig(c.get('session') as Session)));
app.patch('/print-config', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  await service.savePrintConfig(s, await c.req.json());
  return ok(c, null, 'Print config saved');
});

// ---- Nav style ----
app.patch('/nav-style', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = NavStyleSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid nav style: ${b.error.errors[0].message}`, 400);
  await service.updateNavStyle(s, b.data.navStyle);
  return ok(c, null, 'Nav style updated');
});

// ---- Prescription templates ----
app.get('/prescription-templates', requirePermission('settings:view'), async (c) => ok(c, await service.listPrescriptionTemplates(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/prescription-templates', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedTemplateSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid template: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createPrescriptionTemplate(s, b.data), 'Prescription template created');
});
app.patch('/prescription-templates/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedTemplateSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid template: ${b.error.errors[0].message}`, 400);
  await service.updatePrescriptionTemplate(s, c.req.param('id'), b.data);
  return ok(c, null, 'Template updated');
});
app.delete('/prescription-templates/:id', requirePermission('settings:edit'), async (c) => {
  await service.deletePrescriptionTemplate(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Template deleted');
});

// ---- Inpatient templates ----
app.get('/inpatient-templates', requirePermission('settings:view'), async (c) => ok(c, await service.listInpatientTemplates(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/inpatient-templates', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = InpatientTemplateSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid template: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createInpatientTemplate(s, b.data), 'Inpatient template created');
});
app.patch('/inpatient-templates/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = InpatientTemplateSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid template: ${b.error.errors[0].message}`, 400);
  await service.updateInpatientTemplate(s, c.req.param('id'), b.data);
  return ok(c, null, 'Inpatient template updated');
});
app.delete('/inpatient-templates/:id', requirePermission('settings:edit'), async (c) => {
  await service.deleteInpatientTemplate(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Inpatient template deleted');
});

// ---- Packages ----
app.get('/packages', requirePermission('settings:view'), async (c) => ok(c, await service.listPackages(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/packages', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedPackageSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid package: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createPackage(s, b.data), 'Package created');
});
app.patch('/packages/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedPackageSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid package: ${b.error.errors[0].message}`, 400);
  await service.updatePackage(s, c.req.param('id'), b.data);
  return ok(c, null, 'Package updated');
});
app.delete('/packages/:id', requirePermission('settings:edit'), async (c) => {
  await service.deletePackage(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Package deleted');
});

// ---- Surgeries ----
app.get('/surgeries', requirePermission('settings:view'), async (c) => ok(c, await service.listSurgeries(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/surgeries', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedSurgerySchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid surgery: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createSurgery(s, b.data), 'Surgery created');
});
app.patch('/surgeries/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedSurgerySchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid surgery: ${b.error.errors[0].message}`, 400);
  await service.updateSurgery(s, c.req.param('id'), b.data);
  return ok(c, null, 'Surgery updated');
});
app.delete('/surgeries/:id', requirePermission('settings:edit'), async (c) => {
  await service.deleteSurgery(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Surgery soft-deleted');
});

// ---- Discharges ----
app.get('/discharges', requirePermission('settings:view'), async (c) => ok(c, await service.listDischarges(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/discharges', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedDischargeSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid discharge: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createDischarge(s, b.data), 'Discharge summary created');
});
app.patch('/discharges/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = PredefinedDischargeSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid discharge: ${b.error.errors[0].message}`, 400);
  await service.updateDischarge(s, c.req.param('id'), b.data);
  return ok(c, null, 'Discharge summary updated');
});
app.delete('/discharges/:id', requirePermission('settings:edit'), async (c) => {
  await service.deleteDischarge(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Discharge summary soft-deleted');
});

// ---- Medicine master ----
app.get('/medicine-master', requirePermission('settings:view'), async (c) => ok(c, await service.listMedicineMaster(c.get('session') as Session, c.req.query('includeInactive') === 'true')));
app.post('/medicine-master', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = MedicineMasterSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid medicine: ${b.error.errors[0].message}`, 400);
  return created(c, await service.createMedicineMaster(s, b.data), 'Medicine master record created');
});
app.patch('/medicine-master/:id', requirePermission('settings:edit'), async (c) => {
  const s = c.get('session') as Session;
  const b = MedicineMasterSchema.partial().safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid medicine: ${b.error.errors[0].message}`, 400);
  await service.updateMedicineMaster(s, c.req.param('id'), b.data);
  return ok(c, null, 'Medicine master updated');
});
app.delete('/medicine-master/:id', requirePermission('settings:edit'), async (c) => {
  await service.deleteMedicineMaster(c.get('session') as Session, c.req.param('id'));
  return ok(c, null, 'Medicine master deleted');
});

Deno.serve(app.fetch);
