/**
 * patient-care Edge Function — 28 endpoints
 *
 * Routes (openapi.yaml §patient-care):
 *   GET    /patient-care/patients                        patients:view
 *   GET    /patient-care/patients/search                 patients:view
 *   GET    /patient-care/patients/next-id                patients:create
 *   GET    /patient-care/patients/registration-form      patients:create
 *   POST   /patient-care/patients                        patients:create
 *   GET    /patient-care/patients/:id                    patients:view
 *   PATCH  /patient-care/patients/:id                    patients:edit
 *   DELETE /patient-care/patients/:id                    patients:delete
 *   PATCH  /patient-care/patients/:id/status             patients:edit
 *   PATCH  /patient-care/patients/:id/date               patients:edit
 *   GET    /patient-care/patients/:id/last-visit         patients:view
 *   GET    /patient-care/patients/:id/receipt            billing:view
 *   POST   /patient-care/patients/:id/services           billing:create
 *   POST   /patient-care/patients/:id/prescriptions      billing:create
 *   GET    /patient-care/inpatients                      inpatients:view
 *   GET    /patient-care/inpatients/next-id              inpatients:create
 *   GET    /patient-care/inpatients/admission-form       inpatients:create
 *   POST   /patient-care/inpatients                      inpatients:create
 *   GET    /patient-care/inpatients/:id                  inpatients:view
 *   PATCH  /patient-care/inpatients/:id                  inpatients:edit
 *   DELETE /patient-care/inpatients/:id                  inpatients:delete
 *   PATCH  /patient-care/inpatients/:id/basic-info       inpatients:edit
 *   PATCH  /patient-care/inpatients/:id/details          inpatients:edit
 *   PATCH  /patient-care/inpatients/:id/status           inpatients:edit
 *   POST   /patient-care/inpatients/:id/payments         inpatients:edit
 *   POST   /patient-care/inpatients/:id/discharge        inpatients:discharge
 *   GET    /patient-care/dropdown-options                patients:view
 *   POST   /patient-care/dropdown-options                patients:edit
 */

import { Hono } from 'hono';
import { requireAuth } from '../_shared/auth.ts';
import { requirePermission } from '../_shared/permission-guard.ts';
import { handleError, ok, created, paginated, errorResponse } from '../_shared/response.ts';
import type { Session } from '../_shared/auth.ts';
import {
  PatientListQuerySchema,
  PatientSearchQuerySchema,
  CreatePatientSchema,
  UpdatePatientSchema,
  UpdatePatientStatusSchema,
  UpdatePatientDateSchema,
  AddServiceToPatientSchema,
  CreatePrescriptionWithBillingSchema,
  InPatientListQuerySchema,
  CreateInPatientSchema,
  UpdateInPatientBasicInfoSchema,
  UpdateInPatientDetailsSchema,
  UpdateInPatientStatusSchema,
  AddInPatientPaymentSchema,
  DischargeInPatientSchema,
  CreateDropdownOptionSchema,
  DropdownOptionQuerySchema,
} from './types.ts';
import * as service from './service.ts';

const app = new Hono().basePath('/patient-care');
app.use('*', requireAuth);
app.onError(handleError);

// ---- Patient routes — static paths BEFORE parameterized paths ----

app.get('/patients', requirePermission('patients:view'), async (c) => {
  const session = c.get('session') as Session;
  const q = PatientListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.listPatients(session, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});

app.get('/patients/search', requirePermission('patients:view'), async (c) => {
  const session = c.get('session') as Session;
  const q = PatientSearchQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const result = await service.searchPatients(session, q.data);
  return ok(c, result);
});

app.get('/patients/next-id', requirePermission('patients:create'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getNextPatientId(session);
  return ok(c, result);
});

app.get('/patients/registration-form', requirePermission('patients:create'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getPatientRegistrationFormData(session);
  return ok(c, result);
});

app.post('/patients', requirePermission('patients:create'), async (c) => {
  const session = c.get('session') as Session;
  const body = CreatePatientSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid patient data: ${body.error.errors[0].message}`, 400);
  const patient = await service.createPatient(session, body.data);
  return created(c, patient, 'Patient created');
});

app.get('/patients/:id', requirePermission('patients:view'), async (c) => {
  const session = c.get('session') as Session;
  const patient = await service.getPatientById(session, c.req.param('id'));
  return ok(c, patient);
});

app.patch('/patients/:id', requirePermission('patients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = UpdatePatientSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid update: ${body.error.errors[0].message}`, 400);
  const patient = await service.updatePatient(session, c.req.param('id'), body.data);
  return ok(c, patient, 'Patient updated');
});

app.delete('/patients/:id', requirePermission('patients:delete'), async (c) => {
  const session = c.get('session') as Session;
  await service.deletePatient(session, c.req.param('id'));
  return ok(c, null, 'Patient deleted');
});

app.patch('/patients/:id/status', requirePermission('patients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = UpdatePatientStatusSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid status: ${body.error.errors[0].message}`, 400);
  await service.updatePatientStatus(session, c.req.param('id'), body.data.status);
  return ok(c, null, 'Status updated');
});

app.patch('/patients/:id/date', requirePermission('patients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = UpdatePatientDateSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid date: ${body.error.errors[0].message}`, 400);
  await service.movePatientToDate(session, c.req.param('id'), body.data.appointmentDate);
  return ok(c, null, 'Appointment date updated');
});

app.get('/patients/:id/last-visit', requirePermission('patients:view'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getPatientWithLastVisit(session, c.req.param('id'));
  return ok(c, result);
});

app.get('/patients/:id/receipt', requirePermission('billing:view'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getPatientReceiptData(session, c.req.param('id'));
  return ok(c, result);
});

app.post('/patients/:id/services', requirePermission('billing:create'), async (c) => {
  const session = c.get('session') as Session;
  const body = AddServiceToPatientSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid service data: ${body.error.errors[0].message}`, 400);
  const result = await service.addServiceToPatient(session, c.req.param('id'), body.data);
  return created(c, result, 'Service added');
});

app.post('/patients/:id/prescriptions', requirePermission('billing:create'), async (c) => {
  const session = c.get('session') as Session;
  const body = CreatePrescriptionWithBillingSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid prescription data: ${body.error.errors[0].message}`, 400);
  const result = await service.createPrescriptionWithBilling(session, c.req.param('id'), body.data);
  return created(c, result, 'Prescription and billing records created');
});

// ---- InPatient routes — static paths BEFORE parameterized paths ----

app.get('/inpatients', requirePermission('inpatients:view'), async (c) => {
  const session = c.get('session') as Session;
  const q = InPatientListQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const { data, total } = await service.listInPatients(session, q.data);
  return paginated(c, data, { page: q.data.page, pageSize: q.data.pageSize, total });
});

app.get('/inpatients/next-id', requirePermission('inpatients:create'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getNextInPatientId(session);
  return ok(c, result);
});

app.get('/inpatients/admission-form', requirePermission('inpatients:create'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getAdmissionFormData(session);
  return ok(c, result);
});

app.post('/inpatients', requirePermission('inpatients:create'), async (c) => {
  const session = c.get('session') as Session;
  const body = CreateInPatientSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid inpatient data: ${body.error.errors[0].message}`, 400);
  const inpatient = await service.createInPatient(session, body.data);
  return created(c, inpatient, 'Inpatient admitted');
});

app.get('/inpatients/:id', requirePermission('inpatients:view'), async (c) => {
  const session = c.get('session') as Session;
  const result = await service.getInPatientById(session, c.req.param('id'));
  return ok(c, result);
});

app.patch('/inpatients/:id', requirePermission('inpatients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = await c.req.json();
  await service.updateInPatient(session, c.req.param('id'), body);
  return ok(c, null, 'Inpatient updated');
});

app.delete('/inpatients/:id', requirePermission('inpatients:delete'), async (c) => {
  const session = c.get('session') as Session;
  await service.deleteInPatient(session, c.req.param('id'));
  return ok(c, null, 'Inpatient deleted');
});

app.patch('/inpatients/:id/basic-info', requirePermission('inpatients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = UpdateInPatientBasicInfoSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid basic-info: ${body.error.errors[0].message}`, 400);
  await service.updateInPatientBasicInfo(session, c.req.param('id'), body.data);
  return ok(c, null, 'Basic info updated');
});

app.patch('/inpatients/:id/details', requirePermission('inpatients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = UpdateInPatientDetailsSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid details: ${body.error.errors[0].message}`, 400);
  await service.updateInPatientDetails(session, c.req.param('id'), body.data);
  return ok(c, null, 'Details updated');
});

app.patch('/inpatients/:id/status', requirePermission('inpatients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = UpdateInPatientStatusSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid status: ${body.error.errors[0].message}`, 400);
  await service.updateInPatientStatus(session, c.req.param('id'), body.data.status);
  return ok(c, null, 'Status updated');
});

app.post('/inpatients/:id/payments', requirePermission('inpatients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = AddInPatientPaymentSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid payment: ${body.error.errors[0].message}`, 400);
  await service.addInPatientPayment(session, c.req.param('id'), body.data);
  return created(c, null, 'Payment recorded');
});

app.post('/inpatients/:id/discharge', requirePermission('inpatients:discharge'), async (c) => {
  const session = c.get('session') as Session;
  const body = DischargeInPatientSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid discharge data: ${body.error.errors[0].message}`, 400);
  await service.dischargeInPatient(session, c.req.param('id'), body.data);
  return ok(c, null, 'Patient discharged');
});

// ---- Dropdown options ----

app.get('/dropdown-options', requirePermission('patients:view'), async (c) => {
  const session = c.get('session') as Session;
  const q = DropdownOptionQuerySchema.safeParse(c.req.query());
  if (!q.success) return errorResponse(c, `Invalid query: ${q.error.errors[0].message}`, 400);
  const options = await service.getDropdownOptions(session, q.data.fieldName);
  return ok(c, options);
});

app.post('/dropdown-options', requirePermission('patients:edit'), async (c) => {
  const session = c.get('session') as Session;
  const body = CreateDropdownOptionSchema.safeParse(await c.req.json());
  if (!body.success) return errorResponse(c, `Invalid dropdown option: ${body.error.errors[0].message}`, 400);
  const option = await service.addDropdownOption(session, body.data);
  return created(c, option, 'Dropdown option created');
});

export default app.fetch;
