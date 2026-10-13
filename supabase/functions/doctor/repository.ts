/**
 * Data-access layer for the doctor module.
 *
 * Tables owned (write):
 *   Prescription    — patient consultation records (upsert: one per patient per day)
 *   DropdownOption  — doctor-scoped custom dropdown values (per hospital)
 *   MedicineMaster  — shared medicine catalog (also written by settings module)
 *
 * Tables read-only:
 *   Patient             — demographics for consultation view and queue
 *   EyeReading          — today's eye reading nested under Patient (queue + consultation)
 *   PredefinedTemplate  — prescription templates
 *   InvestigationMaster — investigation dropdown data
 *   InvoiceItem         — items nested under prescriptions for billing totals
 *   Payment             — payments nested under prescriptions (consultation + receipt)
 *   LabBill / LabBillItem / Lab — lab bills shown in doctor queue
 *   HospitalProfile     — for receipt printing (no hospital_id column — singleton)
 *
 * Every query is scoped by hospital_id (ADR-007). PII (names, phone numbers)
 * is never passed to console.error — only Supabase error codes are logged.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { withId } from '../_shared/db-helpers.ts';

// ── Narrow row types ─────────────────────────────────────────────────────────

export interface PrescriptionRow {
  id: string;
  patientId: string;
  patientType: string;
  status: string;
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  temperature: number | null;
  pulseRate: number | null;
  spo2: number | null;
  heightCm: number | null;
  weightKg: number | null;
  presentComplaint: string | null;
  previousHistory: string | null;
  diagnosis: string | null;
  additionalNotes: string | null;
  medicines: string | null;
  investigations: string | null;
  followUpDate: string | null;
  notes: string | null;
  prescriptionDate: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertPrescriptionData {
  patientId: string;
  patientType: string;
  hospital_id: string;
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  temperature: number | null;
  pulseRate: number | null;
  spo2: number | null;
  heightCm: number | null;
  weightKg: number | null;
  presentComplaint: string | null;
  previousHistory: string | null;
  diagnosis: string | null;
  additionalNotes: string | null;
  medicines: string;
  investigations: string;
  followUpDate: string | null;
  notes: string | null;
  status: string;
  prescriptionDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePrescriptionData {
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  temperature: number | null;
  pulseRate: number | null;
  spo2: number | null;
  heightCm: number | null;
  weightKg: number | null;
  presentComplaint: string | null;
  previousHistory: string | null;
  diagnosis: string | null;
  additionalNotes: string | null;
  medicines: string;
  investigations: string;
  followUpDate: string | null;
  notes: string | null;
  status: string;
  updatedBy: string;
  updatedAt: string;
}

export interface InsertMedicineData {
  name: string;
  category: string | null;
  defaultTiming: string | null;
  defaultDays: string | null;
  note: string | null;
  hospital_id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsertDropdownOptionData {
  fieldName: string;
  value: string;
  hospital_id: string;
  createdBy: string;
  createdAt: string;
}

// ── Repository ───────────────────────────────────────────────────────────────

export class DoctorRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}

  // ── Doctor queue ──────────────────────────────────────────────────────────

  /**
   * Returns the raw merged patient list for today's doctor queue.
   *
   * Three parallel queries: (a) patients with today's appointment, (b) patients
   * with a today prescription (inner join on prescriptions.prescriptionDate),
   * (c) patients with a today eye reading (inner join on eyeReadings.readingDate).
   *
   * De-duped by patientId (first seen wins). Nested relations are NOT filtered
   * here — the service layer filters them to today's range and computes status.
   */
  async getQueue(startISO: string, endISO: string): Promise<unknown[]> {
    const SELECT_FULL =
      '*, eyeReadings:EyeReading(*), prescriptions:Prescription(*, items:InvoiceItem(*)), labBills:LabBill(*, lab:Lab(name), items:LabBillItem(*))';
    const SELECT_RX_INNER =
      '*, eyeReadings:EyeReading(*), prescriptions:Prescription!inner(*, items:InvoiceItem(*)), labBills:LabBill(*, lab:Lab(name), items:LabBillItem(*))';
    const SELECT_ER_INNER =
      '*, eyeReadings:EyeReading!inner(*), prescriptions:Prescription(*, items:InvoiceItem(*)), labBills:LabBill(*, lab:Lab(name), items:LabBillItem(*))';

    const [apptRes, rxRes, erRes] = await Promise.all([
      this.supabase
        .from('Patient')
        .select(SELECT_FULL)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('appointmentDate', startISO)
        .lte('appointmentDate', endISO)
        .order('createdAt', { ascending: true }),
      this.supabase
        .from('Patient')
        .select(SELECT_RX_INNER)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('prescriptions.prescriptionDate', startISO)
        .lte('prescriptions.prescriptionDate', endISO)
        .order('createdAt', { ascending: true }),
      this.supabase
        .from('Patient')
        .select(SELECT_ER_INNER)
        .eq('hospital_id', this.hospitalId)
        .eq('patientType', 'OPD')
        .gte('eyeReadings.readingDate', startISO)
        .lte('eyeReadings.readingDate', endISO)
        .order('createdAt', { ascending: true }),
    ]);

    if (apptRes.error) {
      console.error(JSON.stringify({ level: 'error', msg: 'DoctorRepository.getQueue/appt', code: apptRes.error.code }));
      return [];
    }
    if (rxRes.error) {
      console.error(JSON.stringify({ level: 'error', msg: 'DoctorRepository.getQueue/rx', code: rxRes.error.code }));
      return [];
    }
    if (erRes.error) {
      console.error(JSON.stringify({ level: 'error', msg: 'DoctorRepository.getQueue/er', code: erRes.error.code }));
      return [];
    }

    // De-dup by patientId — first seen wins (appointment > prescription > eye reading priority)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = new Map<string, any>();
    for (const p of (apptRes.data ?? [])) merged.set(p.patientId, p);
    for (const p of (rxRes.data ?? [])) {
      if (!merged.has(p.patientId)) merged.set(p.patientId, p);
    }
    for (const p of (erRes.data ?? [])) {
      if (!merged.has(p.patientId)) merged.set(p.patientId, p);
    }

    return Array.from(merged.values());
  }

  // ── Patient (consultation view) ───────────────────────────────────────────

  async findPatient(patientId: string): Promise<unknown | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select(
        '*, eyeReadings:EyeReading(*), prescriptions:Prescription(*, items:InvoiceItem(*), payments:Payment(*))',
      )
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .maybeSingle();

    if (error) {
      console.error(JSON.stringify({ level: 'error', msg: 'DoctorRepository.findPatient', code: error.code }));
    }
    return data ?? null;
  }

  // ── Prescription (upsert) ─────────────────────────────────────────────────

  /**
   * Looks for an existing prescription for this patient in today's IST date range.
   * Orders by createdAt DESC so the most recent (e.g. billing-only) is returned first.
   * Returns null if none found — caller then inserts a new prescription.
   */
  async findTodayPrescription(patientId: string, startISO: string, endISO: string): Promise<PrescriptionRow | null> {
    const { data } = await this.supabase
      .from('Prescription')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .gte('prescriptionDate', startISO)
      .lte('prescriptionDate', endISO)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data as PrescriptionRow | null) ?? null;
  }

  async insertPrescription(data: InsertPrescriptionData): Promise<PrescriptionRow> {
    const { data: row, error } = await this.supabase
      .from('Prescription')
      .insert(withId(data))
      .select()
      .single();

    if (error || !row) {
      throw new Error(`Failed to insert prescription for patientId "${data.patientId}": ${error?.message ?? 'no data returned'}`);
    }
    return row as PrescriptionRow;
  }

  async updatePrescription(id: string, data: UpdatePrescriptionData): Promise<PrescriptionRow> {
    const { data: row, error } = await this.supabase
      .from('Prescription')
      .update(data)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .select()
      .single();

    if (error || !row) {
      throw new Error(`Failed to update Prescription with id "${id}": ${error?.message ?? 'no data returned'}`);
    }
    return row as PrescriptionRow;
  }

  // ── Medicine master ───────────────────────────────────────────────────────

  async getMedicineMaster(): Promise<unknown[]> {
    const { data } = await this.supabase
      .from('MedicineMaster')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });

    return data ?? [];
  }

  async insertMedicine(data: InsertMedicineData): Promise<unknown> {
    const { data: row, error } = await this.supabase
      .from('MedicineMaster')
      .insert(withId(data))
      .select()
      .single();

    if (error || !row) {
      throw new Error(`Failed to create MedicineMaster "${data.name}": ${error?.message ?? 'no data returned'}`);
    }
    return row;
  }

  // ── Investigation master ──────────────────────────────────────────────────

  async getInvestigationMaster(): Promise<unknown[]> {
    const { data } = await this.supabase
      .from('InvestigationMaster')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })
      .order('name', { ascending: true });

    return data ?? [];
  }

  // ── Predefined templates ──────────────────────────────────────────────────

  async getPredefinedTemplates(): Promise<unknown[]> {
    const { data } = await this.supabase
      .from('PredefinedTemplate')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .eq('isActive', true)
      .order('name', { ascending: true });

    return data ?? [];
  }

  // ── Dropdown options ──────────────────────────────────────────────────────

  /**
   * Returns all doctor dropdown options for this hospital, pre-bucketed by
   * fieldName. Always covers the four doctor workflow fields:
   *   presentComplaint, previousHistory, diagnosis, additionalNotes.
   */
  async getDropdownOptions(): Promise<Record<string, string[]>> {
    const DOCTOR_FIELDS = ['presentComplaint', 'previousHistory', 'diagnosis', 'additionalNotes'];

    const { data } = await this.supabase
      .from('DropdownOption')
      .select('fieldName, value')
      .eq('hospital_id', this.hospitalId)
      .in('fieldName', DOCTOR_FIELDS)
      .order('value', { ascending: true });

    const bucket: Record<string, string[]> = {
      presentComplaint: [],
      previousHistory: [],
      diagnosis: [],
      additionalNotes: [],
    };
    for (const row of (data ?? []) as Array<{ fieldName: string; value: string }>) {
      if (bucket[row.fieldName]) bucket[row.fieldName].push(row.value);
    }
    return bucket;
  }

  /** Returns true if the exact (fieldName, value) pair already exists. */
  async dropdownOptionExists(fieldName: string, value: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('DropdownOption')
      .select('id')
      .eq('hospital_id', this.hospitalId)
      .eq('fieldName', fieldName)
      .eq('value', value)
      .limit(1)
      .maybeSingle();

    return data !== null;
  }

  async insertDropdownOption(data: InsertDropdownOptionData): Promise<void> {
    const { error } = await this.supabase.from('DropdownOption').insert(withId(data));
    if (error) {
      throw new Error(
        `Failed to insert DropdownOption fieldName="${data.fieldName}": ${error.message}`,
      );
    }
  }

  // ── Receipt (billing:view) ────────────────────────────────────────────────

  /**
   * Fetches a patient with full prescription + items + payments, and all eye
   * readings. The service layer filters to today's date and returns the shape
   * expected by the receipt printer.
   */
  async findPatientWithReceipt(patientId: string): Promise<unknown | null> {
    const { data } = await this.supabase
      .from('Patient')
      .select(
        '*, eyeReadings:EyeReading(*), prescriptions:Prescription(*, items:InvoiceItem(*), payments:Payment(*))',
      )
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', patientId)
      .maybeSingle();

    return data ?? null;
  }

  /**
   * Returns this hospital's HospitalProfile row. The table has no hospital_id
   * column (it IS the tenant root; see 4-datamodel.md §2.1 row 3) — its own
   * `id` equals the session's hospitalId. Scoped by `.eq('id', ...)`, not
   * `.limit(1)` alone: `.limit(1)` would arbitrarily return whichever
   * hospital's row Postgres returns first once a second tenant exists —
   * harmless today with exactly one row, but a real bug the moment a second
   * hospital is onboarded. Found and fixed post-commit (same class of issue
   * as patient-care and settings' HospitalProfile queries).
   */
  async getHospitalProfile(): Promise<unknown | null> {
    const { data } = await this.supabase
      .from('HospitalProfile')
      .select('*')
      .eq('id', this.hospitalId)
      .maybeSingle();

    return data ?? null;
  }
}
