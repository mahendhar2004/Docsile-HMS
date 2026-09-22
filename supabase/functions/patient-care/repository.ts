/**
 * Data-access layer for the patient-care module.
 *
 * Tables owned by this module:
 *   - Patient       — patient registration, demographics, appointment tracking
 *   - Prescription  — OPD prescriptions (medicines, investigations, billing linkage)
 *   - InPatient     — IPD admissions (ward, bed, on-duty doctors, payment records)
 *   - InvoiceItem   — line items attached to Prescription (CASCADE delete)
 *   - Payment       — payments against a Prescription
 *   - EyeReading    — auto-refractometer / glasses readings (read here; owned by workup)
 *   - DropdownOption — patient-related dropdown values (shared with settings module)
 *
 * Every query MUST include .eq('hospital_id', hospitalId) to enforce tenant isolation (ADR-007).
 * Phase 7 implements all query methods.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class PatientCareRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // Phase 7: implement all methods:
  // listPatients(date, page, pageSize)
  // searchPatients(q, cursor, limit)
  // getNextPatientNumber()
  // getRegistrationFormData()
  // createPatient(data)
  // getPatientById(id)
  // updatePatient(id, data)
  // deletePatient(id)
  // updatePatientStatus(id, status)
  // updatePatientDate(id, appointmentDate)
  // getPatientWithLastVisit(id)
  // getPatientReceiptData(id)
  // addServiceToPatient(patientId, data)
  // createPrescriptionWithBilling(patientId, prescription, invoiceItems, payment)
  // listInPatients(date, status, page, pageSize)
  // getNextIpNumber()
  // getAdmissionFormData()
  // createInPatient(data)
  // getInPatientById(id)
  // updateInPatient(id, data)
  // updateInPatientBasicInfo(id, data)
  // updateInPatientDetails(id, data)
  // updateInPatientStatus(id, status)
  // addInPatientPayment(id, data)
  // dischargeInPatient(id, data)
  // deleteInPatient(id)
  // getDropdownOptions(fieldName?)
  // addDropdownOption(data)
}
