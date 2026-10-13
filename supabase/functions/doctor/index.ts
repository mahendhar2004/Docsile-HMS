/**
 * doctor Edge Function — 12 endpoints
 *
 * Routes (openapi.yaml §doctor):
 *   GET  /doctor/queue                                doctor:view
 *   GET  /doctor/patients/:patientId/consultation     doctor:view
 *   POST /doctor/patients/:patientId/prescriptions    doctor:consult
 *   GET  /doctor/reference-data                       doctor:view
 *   GET  /doctor/medicine-master                      doctor:view
 *   GET  /doctor/investigation-master                 doctor:view
 *   GET  /doctor/prescription-templates               doctor:view
 *   GET  /doctor/dropdown-options                     doctor:view
 *   POST /doctor/dropdown-options                     doctor:consult
 *   POST /doctor/medicines                            doctor:consult
 *   GET  /doctor/patients/:patientId/receipt          billing:view
 *   POST /doctor/ai/ask                               doctor:consult
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import { corsMiddleware } from '../_shared/cors.ts';
import { PrescriptionSchema, MedicineMasterSchema, DropdownOptionSchema, AskSithaSchema } from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/doctor');
app.use('*', corsMiddleware);
app.use('*', requireAuth);
app.onError(handleError);

app.get('/queue', requirePermission('doctor:view'), async (c) => ok(c, await service.getDoctorQueue(c.get('session') as Session)));

// ---- Reference data (static routes — all before parameterized) ----
app.get('/reference-data', requirePermission('doctor:view'), async (c) => ok(c, await service.getReferenceData(c.get('session') as Session)));
app.get('/medicine-master', requirePermission('doctor:view'), async (c) => ok(c, await service.getMedicineMaster(c.get('session') as Session)));
app.get('/investigation-master', requirePermission('doctor:view'), async (c) => ok(c, await service.getInvestigationMaster(c.get('session') as Session)));
app.get('/prescription-templates', requirePermission('doctor:view'), async (c) => ok(c, await service.getPrescriptionTemplates(c.get('session') as Session)));
app.get('/dropdown-options', requirePermission('doctor:view'), async (c) => ok(c, await service.getDropdownOptions(c.get('session') as Session)));
app.post('/dropdown-options', requirePermission('doctor:consult'), async (c) => {
  const s = c.get('session') as Session;
  const b = DropdownOptionSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid option: ${b.error.errors[0].message}`, 400);
  await service.addDropdownOption(s, b.data);
  return created(c, null, 'Dropdown option added');
});
app.post('/medicines', requirePermission('doctor:consult'), async (c) => {
  const s = c.get('session') as Session;
  const b = MedicineMasterSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid medicine: ${b.error.errors[0].message}`, 400);
  await service.createMedicine(s, b.data);
  return created(c, null, 'Medicine created');
});

// ---- AI assistant ----
app.post('/ai/ask', requirePermission('doctor:consult'), async (c) => {
  const s = c.get('session') as Session;
  const b = AskSithaSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid request: ${b.error.errors[0].message}`, 400);
  return ok(c, await service.askSithaAI(s, b.data));
});

// ---- Patient-scoped routes ----
app.get('/patients/:patientId/consultation', requirePermission('doctor:view'), async (c) => ok(c, await service.getPatientConsultation(c.get('session') as Session, c.req.param('patientId'))));
app.post('/patients/:patientId/prescriptions', requirePermission('doctor:consult'), async (c) => {
  const s = c.get('session') as Session;
  const b = PrescriptionSchema.safeParse(await c.req.json());
  if (!b.success) return errorResponse(c, `Invalid prescription: ${b.error.errors[0].message}`, 400);
  return ok(c, await service.savePrescription(s, c.req.param('patientId'), b.data), 'Prescription saved');
});
app.get('/patients/:patientId/receipt', requirePermission('billing:view'), async (c) => ok(c, await service.getPatientReceipt(c.get('session') as Session, c.req.param('patientId'))));

Deno.serve(app.fetch);
