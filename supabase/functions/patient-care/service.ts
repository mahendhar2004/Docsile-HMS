/**
 * Business logic stubs for the patient-care module — 28 route handlers.
 * Phase 7 replaces each throw with the real implementation.
 */

import { NotImplementedError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type {
  Patient,
  InPatient,
  CreatePatientBody,
  UpdatePatientBody,
  CreateInPatientBody,
  UpdateInPatientBasicInfoSchema,
  UpdateInPatientDetailsSchema,
  AddInPatientPaymentSchema,
  DischargeInPatientSchema,
  CreateDropdownOptionSchema,
  AddServiceToPatientSchema,
  CreatePrescriptionWithBillingSchema,
} from './types.ts';
import type { z } from 'zod';

type UpdateInPatientBasicInfo = z.infer<typeof UpdateInPatientBasicInfoSchema>;
type UpdateInPatientDetails = z.infer<typeof UpdateInPatientDetailsSchema>;
type AddInPatientPayment = z.infer<typeof AddInPatientPaymentSchema>;
type DischargeInPatient = z.infer<typeof DischargeInPatientSchema>;
type CreateDropdownOption = z.infer<typeof CreateDropdownOptionSchema>;
type AddServiceToPatient = z.infer<typeof AddServiceToPatientSchema>;
type CreatePrescriptionWithBilling = z.infer<typeof CreatePrescriptionWithBillingSchema>;

// ---- Patient endpoints ----

export async function listPatients(
  _session: Session,
  _query: { date?: string; page: number; pageSize: number },
): Promise<{ data: Patient[]; total: number }> {
  throw new NotImplementedError('patient-care.listPatients — Phase 7');
}

export async function searchPatients(
  _session: Session,
  _query: { q: string; cursor?: string; limit: number },
): Promise<{ patients: Patient[]; nextCursor: string | null }> {
  throw new NotImplementedError('patient-care.searchPatients — Phase 7');
}

export async function getNextPatientId(_session: Session): Promise<{ nextPatientId: string }> {
  throw new NotImplementedError('patient-care.getNextPatientId — Phase 7');
}

export async function getPatientRegistrationFormData(_session: Session): Promise<unknown> {
  throw new NotImplementedError('patient-care.getPatientRegistrationFormData — Phase 7');
}

export async function createPatient(_session: Session, _body: CreatePatientBody): Promise<Patient> {
  throw new NotImplementedError('patient-care.createPatient — Phase 7');
}

export async function getPatientById(_session: Session, _id: string): Promise<Patient> {
  throw new NotImplementedError('patient-care.getPatientById — Phase 7');
}

export async function updatePatient(
  _session: Session,
  _id: string,
  _body: UpdatePatientBody,
): Promise<Patient> {
  throw new NotImplementedError('patient-care.updatePatient — Phase 7');
}

export async function deletePatient(_session: Session, _id: string): Promise<void> {
  throw new NotImplementedError('patient-care.deletePatient — Phase 7');
}

export async function updatePatientStatus(
  _session: Session,
  _id: string,
  _status: string,
): Promise<void> {
  throw new NotImplementedError('patient-care.updatePatientStatus — Phase 7');
}

export async function movePatientToDate(
  _session: Session,
  _id: string,
  _appointmentDate: string,
): Promise<void> {
  throw new NotImplementedError('patient-care.movePatientToDate — Phase 7');
}

export async function getPatientWithLastVisit(_session: Session, _id: string): Promise<unknown> {
  throw new NotImplementedError('patient-care.getPatientWithLastVisit — Phase 7');
}

export async function getPatientReceiptData(_session: Session, _id: string): Promise<unknown> {
  throw new NotImplementedError('patient-care.getPatientReceiptData — Phase 7');
}

export async function addServiceToPatient(
  _session: Session,
  _patientId: string,
  _body: AddServiceToPatient,
): Promise<unknown> {
  throw new NotImplementedError('patient-care.addServiceToPatient — Phase 7');
}

export async function createPrescriptionWithBilling(
  _session: Session,
  _patientId: string,
  _body: CreatePrescriptionWithBilling,
): Promise<unknown> {
  throw new NotImplementedError('patient-care.createPrescriptionWithBilling — Phase 7');
}

// ---- InPatient endpoints ----

export async function listInPatients(
  _session: Session,
  _query: { date?: string; status?: string; page: number; pageSize: number },
): Promise<{ data: InPatient[]; total: number }> {
  throw new NotImplementedError('patient-care.listInPatients — Phase 7');
}

export async function getNextInPatientId(_session: Session): Promise<{ nextIpNumber: string }> {
  throw new NotImplementedError('patient-care.getNextInPatientId — Phase 7');
}

export async function getAdmissionFormData(_session: Session): Promise<unknown> {
  throw new NotImplementedError('patient-care.getAdmissionFormData — Phase 7');
}

export async function createInPatient(
  _session: Session,
  _body: CreateInPatientBody,
): Promise<InPatient> {
  throw new NotImplementedError('patient-care.createInPatient — Phase 7');
}

export async function getInPatientById(_session: Session, _id: string): Promise<InPatient> {
  throw new NotImplementedError('patient-care.getInPatientById — Phase 7');
}

export async function updateInPatient(
  _session: Session,
  _id: string,
  _body: Partial<InPatient>,
): Promise<void> {
  throw new NotImplementedError('patient-care.updateInPatient — Phase 7');
}

export async function updateInPatientBasicInfo(
  _session: Session,
  _id: string,
  _body: UpdateInPatientBasicInfo,
): Promise<void> {
  throw new NotImplementedError('patient-care.updateInPatientBasicInfo — Phase 7');
}

export async function updateInPatientDetails(
  _session: Session,
  _id: string,
  _body: UpdateInPatientDetails,
): Promise<void> {
  throw new NotImplementedError('patient-care.updateInPatientDetails — Phase 7');
}

export async function updateInPatientStatus(
  _session: Session,
  _id: string,
  _status: 'admitted' | 'discharged',
): Promise<void> {
  throw new NotImplementedError('patient-care.updateInPatientStatus — Phase 7');
}

export async function addInPatientPayment(
  _session: Session,
  _id: string,
  _body: AddInPatientPayment,
): Promise<void> {
  throw new NotImplementedError('patient-care.addInPatientPayment — Phase 7');
}

export async function dischargeInPatient(
  _session: Session,
  _id: string,
  _body: DischargeInPatient,
): Promise<void> {
  throw new NotImplementedError('patient-care.dischargeInPatient — Phase 7');
}

export async function deleteInPatient(_session: Session, _id: string): Promise<void> {
  throw new NotImplementedError('patient-care.deleteInPatient — Phase 7');
}

// ---- Dropdown options ----

export async function getDropdownOptions(
  _session: Session,
  _fieldName?: string,
): Promise<unknown[]> {
  throw new NotImplementedError('patient-care.getDropdownOptions — Phase 7');
}

export async function addDropdownOption(
  _session: Session,
  _body: CreateDropdownOption,
): Promise<unknown> {
  throw new NotImplementedError('patient-care.addDropdownOption — Phase 7');
}
