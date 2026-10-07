/**
 * Data-access layer for the patient-care module.
 *
 * Tables owned by this module:
 *   - Patient        — patient registration, demographics, appointment tracking
 *   - InPatient      — IPD admissions (ward, bed, on-duty doctors, payment records)
 *   - Prescription   — OPD prescriptions (medicines, investigations, billing linkage)
 *   - InvoiceItem    — line items attached to Prescription (CASCADE delete)
 *   - Payment        — payments against a Prescription
 *   - DropdownOption — patient-related dropdown values
 *
 * Reference tables read (not written) by this module:
 *   - HospitalProfile    — one row per hospital, no hospital_id column (its own
 *                          `id` IS the hospital identifier used everywhere else)
 *                          — always fetched via .eq('id', this.hospitalId), never
 *                          .limit(1) alone (that would return an arbitrary hospital's
 *                          row once a second tenant exists; fixed during review —
 *                          harmless today with exactly one row, but would have broken
 *                          silently the moment hospital #2 was onboarded)
 *   - ServiceTemplate    — service catalog, scoped to hospital_id
 *   - PredefinedSurgery  — admission-form reference data
 *   - PredefinedPackage  — admission-form reference data
 *
 * Every query against a hospital-scoped table MUST include
 * .eq('hospital_id', this.hospitalId) to enforce tenant isolation (ADR-007).
 * The service_role key bypasses RLS; this WHERE clause is the sole enforcement.
 *
 * ID generation uses the Postgres atomic sequences added in migration
 * 20260921130000 — never reimplement "SELECT MAX + 1" here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, ServiceUnavailableError } from '../_shared/errors.ts';

export class PatientCareRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // ============================================================
  // PATIENT — data access
  // ============================================================

  /**
   * Paginated list of patients scoped to this hospital.
   * When date is provided, filters to appointments on that IST calendar day.
   * Returns nested prescriptions + eyeReadings so the service layer can compute
   * the derived patient status without a second round-trip.
   */
  async listPatients(
    date: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const PRESCRIPTION_FIELDS =
      'id, status, doctorName, createdAt, prescriptionDate, total, balanceDue, amountPaid, payments:Payment(amount,paymentMode), items:InvoiceItem(description,sortOrder)';
    const EYE_READING_FIELDS = 'id, readingDate, createdAt';
    const SELECT = `*, prescriptions:Prescription(${PRESCRIPTION_FIELDS}), eyeReadings:EyeReading(${EYE_READING_FIELDS})`;

    let query = this.supabase
      .from('Patient')
      .select(SELECT, { count: 'exact' })
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (date) {
      // IST day bounds: filter appointmentDate to the given calendar day in IST (+05:30)
      query = query
        .gte('appointmentDate', `${date}T00:00:00+05:30`)
        .lte('appointmentDate', `${date}T23:59:59+05:30`);
    }

    const { data, error, count } = await query;
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return { data: (data ?? []) as Record<string, unknown>[], total: count ?? 0 };
  }

  /**
   * Cursor-based patient search across patientId, phone, firstName, lastName.
   * Fetches limit+1 rows to detect whether a next page exists.
   * Returns the rows (trimmed to limit) and the nextCursor (updatedAt of the last row).
   */
  async searchPatients(
    q: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<{ patients: Record<string, unknown>[]; nextCursor: string | null }> {
    let query = this.supabase
      .from('Patient')
      .select(
        'id, patientId, firstName, lastName, phone, age, gender, patientType, appointmentDate, address, guardianName, guardianRelation, dateOfBirth, prescriptions:Prescription(prescriptionDate)',
      )
      .eq('hospital_id', this.hospitalId)
      .or(
        `patientId.ilike.%${q}%,phone.ilike.%${q}%,firstName.ilike.%${q}%,lastName.ilike.%${q}%`,
      )
      .order('updatedAt', { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt('updatedAt', cursor);
    }

    const { data, error } = await query;
    if (error) throw new ServiceUnavailableError('Supabase', error.message);

    const rows = (data ?? []) as Record<string, unknown>[];
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      rows.pop();
      const last = rows[rows.length - 1];
      nextCursor = (last?.updatedAt as string) ?? null;
    }

    return { patients: rows, nextCursor };
  }

  /**
   * Advance the patient_number_seq sequence and return the next value.
   * H-3 fix: replaces the old "SELECT MAX + 1" race-condition pattern.
   */
  async getNextPatientNumber(): Promise<number> {
    const { data, error } = await this.supabase.rpc('next_patient_number');
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as number;
  }

  /**
   * Bundled read for the patient registration form.
   * Returns hospital profile, active service templates, and all relevant dropdown options
   * in a single parallel fetch. Does NOT advance any sequence — next-id is a separate
   * call (GET /patients/next-id) so we don't waste a sequence slot when users just open
   * the form without creating a patient.
   */
  async getRegistrationFormData(): Promise<{
    hospitalProfile: Record<string, unknown> | null;
    serviceTemplates: Record<string, unknown>[];
    dropdowns: Record<string, unknown>[];
  }> {
    const [hospitalRes, templatesRes, dropdownRes] = await Promise.all([
      this.supabase.from('HospitalProfile').select('*').eq('id', this.hospitalId).single(),
      this.supabase
        .from('ServiceTemplate')
        .select('*')
        .eq('hospital_id', this.hospitalId)
        .eq('isActive', true)
        .order('sortOrder', { ascending: true })
        .order('name', { ascending: true }),
      this.supabase
        .from('DropdownOption')
        .select('fieldName, value')
        .eq('hospital_id', this.hospitalId)
        .in('fieldName', ['doctorName', 'department', 'referredBy', 'address', 'patientCategory'])
        .order('value', { ascending: true }),
    ]);

    return {
      hospitalProfile: hospitalRes.data as Record<string, unknown> | null,
      serviceTemplates: (templatesRes.data ?? []) as Record<string, unknown>[],
      dropdowns: (dropdownRes.data ?? []) as Record<string, unknown>[],
    };
  }

  /**
   * Fetch a single patient by UUID id, including nested prescriptions + eye readings.
   * Returns null when not found (caller converts to NotFoundError).
   */
  async findPatientById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select(
        '*, prescriptions:Prescription(*, items:InvoiceItem(*), payments:Payment(*), eyeReading:EyeReading(*)), eyeReadings:EyeReading(*)',
      )
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown> | null;
  }

  /**
   * Lightweight patient lookup returning only id + patientId (sequential string).
   * Used by delete and billing-adjacent operations that need the sequential patientId
   * to scope Prescription / EyeReading queries (those FKs reference Patient.patientId,
   * not Patient.id).
   */
  async findPatientRowById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('id, patientId')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown> | null;
  }

  /** Fetch patient with prescriptions only — used by getPatientWithLastVisit. */
  async findPatientWithPrescriptions(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('*, prescriptions:Prescription(*)')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown> | null;
  }

  /** Insert a new patient row and return the created record. hospital_id is injected. */
  async insertPatient(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('Patient')
      .insert({ ...payload, hospital_id: this.hospitalId })
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown>;
  }

  /** Apply a partial update to a patient by UUID id. Returns the updated record. */
  async updatePatientById(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('Patient')
      .update(patch)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown>;
  }

  /**
   * Hard-delete a patient and all their dependent records in FK-safe order.
   *
   * Deletion order (matches old Next.js deletePatient cascade):
   * 1. Payments (by prescriptionIds) — explicit even though InvoiceItem cascades
   * 2. InvoiceItems (by prescriptionIds) — CASCADE would handle these, but explicit is safer
   * 3. EyeReadings (linked by sequential patientId)
   * 4. Prescriptions (linked by sequential patientId)
   * 5. InsuranceClaims (linked by InPatient.id — RESTRICT FK, must go first)
   * 6. InPatient record
   * 7. Patient row itself
   *
   * InPatient.patientId references Patient.id (UUID), while
   * Prescription.patientId / EyeReading.patientId reference Patient.patientId (sequential string).
   */
  async deletePatientById(id: string): Promise<void> {
    const patientRow = await this.findPatientRowById(id);
    if (!patientRow) return; // already gone — treat as no-op

    const sequentialPatientId = patientRow.patientId as string;

    // 1–2. Prescriptions' child rows
    const { data: prescriptions } = await this.supabase
      .from('Prescription')
      .select('id')
      .eq('patientId', sequentialPatientId)
      .eq('hospital_id', this.hospitalId);

    const prescriptionIds = ((prescriptions ?? []) as Record<string, unknown>[]).map(
      (p) => p.id as string,
    );

    if (prescriptionIds.length > 0) {
      await this.supabase.from('Payment').delete().in('prescriptionId', prescriptionIds);
      await this.supabase.from('InvoiceItem').delete().in('prescriptionId', prescriptionIds);
    }

    // 3. Eye readings
    await this.supabase
      .from('EyeReading')
      .delete()
      .eq('patientId', sequentialPatientId)
      .eq('hospital_id', this.hospitalId);

    // 4. Prescriptions
    await this.supabase
      .from('Prescription')
      .delete()
      .eq('patientId', sequentialPatientId)
      .eq('hospital_id', this.hospitalId);

    // 5–6. InPatient + InsuranceClaims (InPatient.patientId FK→Patient.id UUID)
    const { data: inpatient } = await this.supabase
      .from('InPatient')
      .select('id')
      .eq('patientId', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (inpatient) {
      const ip = inpatient as Record<string, unknown>;
      await this.supabase
        .from('InsuranceClaim')
        .delete()
        .eq('inPatientId', ip.id as string)
        .eq('hospital_id', this.hospitalId);

      await this.supabase
        .from('InPatient')
        .delete()
        .eq('id', ip.id as string)
        .eq('hospital_id', this.hospitalId);
    }

    // 7. Patient
    const { error } = await this.supabase
      .from('Patient')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /**
   * Fetch receipt data: full patient row with prescriptions + invoice items + payments
   * + eye readings, plus the singleton hospital profile.
   * Used by GET /patients/:id/receipt.
   */
  async getPatientReceiptData(
    id: string,
  ): Promise<{
    patient: Record<string, unknown> | null;
    hospital: Record<string, unknown> | null;
  }> {
    const [patientRes, hospitalRes] = await Promise.all([
      this.supabase
        .from('Patient')
        .select(
          '*, eyeReadings:EyeReading(*), prescriptions:Prescription(*, items:InvoiceItem(*), payments:Payment(*))',
        )
        .eq('id', id)
        .eq('hospital_id', this.hospitalId)
        .maybeSingle(),
      this.supabase.from('HospitalProfile').select('*').eq('id', this.hospitalId).single(),
    ]);

    return {
      patient: patientRes.data as Record<string, unknown> | null,
      hospital: hospitalRes.data as Record<string, unknown> | null,
    };
  }

  // ============================================================
  // INPATIENT — data access
  // ============================================================

  /**
   * Paginated list of inpatients scoped to this hospital.
   * When date is provided, filters to admissions on that IST calendar day.
   * When status is provided, applies exact status filter (API values mapped to DB values).
   * Embeds the linked Patient row (InPatient.patientId -> Patient.id) so callers
   * can display the patient's name/phone/gender — without this join every row's
   * name fell back to a truncated UUID, since InPatient itself stores no
   * demographic fields. The service layer flattens `patient.*` onto the row.
   */
  async listInPatients(
    date: string | undefined,
    status: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('InPatient')
      .select('*, patient:Patient(firstName, lastName, phone, gender, dateOfBirth)', {
        count: 'exact',
      })
      .eq('hospital_id', this.hospitalId)
      .order('admissionDate', { ascending: false })
      .range(from, to);

    if (date) {
      query = query
        .gte('admissionDate', `${date}T00:00:00+05:30`)
        .lte('admissionDate', `${date}T23:59:59+05:30`);
    }

    if (status) {
      // Map simplified API values ('admitted'/'discharged') to DB enum values.
      // The DB may still use 'ADMITTED'/'DISCHARGED' from the old schema.
      const dbStatus =
        status === 'admitted' ? 'ADMITTED' : status === 'discharged' ? 'DISCHARGED' : status;
      query = query.eq('status', dbStatus);
    }

    const { data, error, count } = await query;
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return { data: (data ?? []) as Record<string, unknown>[], total: count ?? 0 };
  }

  /**
   * Advance the ip_number_seq sequence and return the next value.
   * H-3 fix: replaces the old "SELECT MAX + 1" race-condition pattern.
   */
  async getNextIpNumber(): Promise<number> {
    const { data, error } = await this.supabase.rpc('next_ip_number');
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as number;
  }

  /**
   * Bundled read for the IPD admission form.
   * Returns hospital profile, dropdown options, predefined surgeries, and predefined
   * packages in a single parallel fetch. Does NOT advance the ip_number_seq —
   * next-id is a separate call (GET /inpatients/next-id).
   */
  async getAdmissionFormData(): Promise<{
    hospitalProfile: Record<string, unknown> | null;
    dropdowns: Record<string, unknown>[];
    predefinedSurgeries: Record<string, unknown>[];
    predefinedPackages: Record<string, unknown>[];
  }> {
    const [hospitalRes, dropdownRes, surgeriesRes, packagesRes] = await Promise.all([
      this.supabase.from('HospitalProfile').select('*').eq('id', this.hospitalId).single(),
      this.supabase
        .from('DropdownOption')
        .select('fieldName, value')
        .eq('hospital_id', this.hospitalId)
        .in('fieldName', ['doctorName', 'department', 'referredBy'])
        .order('value', { ascending: true }),
      this.supabase
        .from('PredefinedSurgery')
        .select('*')
        .eq('hospital_id', this.hospitalId)
        .order('name', { ascending: true }),
      this.supabase
        .from('PredefinedPackage')
        .select('*')
        .eq('hospital_id', this.hospitalId)
        .order('name', { ascending: true }),
    ]);

    return {
      hospitalProfile: hospitalRes.data as Record<string, unknown> | null,
      dropdowns: (dropdownRes.data ?? []) as Record<string, unknown>[],
      predefinedSurgeries: (surgeriesRes.data ?? []) as Record<string, unknown>[],
      predefinedPackages: (packagesRes.data ?? []) as Record<string, unknown>[],
    };
  }

  /**
   * Fetch a single inpatient by UUID id.
   * Returns null when not found. Embeds the linked Patient row (see
   * listInPatients doc) — the service layer flattens `patient.*` onto the row.
   */
  async findInPatientById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('InPatient')
      .select('*, patient:Patient(firstName, lastName, phone, gender, dateOfBirth)')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown> | null;
  }

  /** Insert a new inpatient row and return the created record. hospital_id is injected. */
  async insertInPatient(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('InPatient')
      .insert({ ...payload, hospital_id: this.hospitalId })
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown>;
  }

  /** Apply a partial update to an inpatient by UUID id. */
  async updateInPatientById(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('InPatient')
      .update(patch)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /**
   * Hard-delete an inpatient record.
   * Insurance claims must be deleted first because of the RESTRICT FK
   * (InsuranceClaim.inPatientId → InPatient.id).
   */
  async deleteInPatientById(id: string): Promise<void> {
    await this.supabase
      .from('InsuranceClaim')
      .delete()
      .eq('inPatientId', id)
      .eq('hospital_id', this.hospitalId);

    const { error } = await this.supabase
      .from('InPatient')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  // ============================================================
  // BILLING-ADJACENT — Prescription, InvoiceItem, Payment
  // ============================================================

  /**
   * Advance the prescription_number_seq and return the formatted string
   * (e.g. "2026-0001"). The RPC handles year-based formatting and resets.
   */
  async getNextPrescriptionNumber(): Promise<string> {
    const year = String(new Date().getFullYear());
    const { data, error } = await this.supabase.rpc('next_prescription_number', {
      p_year: year,
    });
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as string;
  }

  /**
   * Find the most recent prescription for this patient (by sequential patientId string)
   * on today's IST calendar day, including its invoice items.
   * Returns null if no prescription exists today.
   *
   * Used by addServiceToPatient and createPrescriptionWithBilling to decide
   * whether to append to an existing prescription or create a new one.
   */
  async getTodaysPrescriptionForPatient(
    sequentialPatientId: string,
  ): Promise<Record<string, unknown> | null> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('*, items:InvoiceItem(*)')
      .eq('patientId', sequentialPatientId)
      .eq('hospital_id', this.hospitalId)
      .gte('prescriptionDate', `${today}T00:00:00+05:30`)
      .lte('prescriptionDate', `${today}T23:59:59+05:30`)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown> | null;
  }

  /** Insert a new prescription row. hospital_id is injected. */
  async insertPrescription(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .insert({ ...payload, hospital_id: this.hospitalId })
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown>;
  }

  /**
   * Apply a partial update to a prescription by UUID id. Returns the updated record.
   * hospital_id is included in the WHERE clause per ADR-007 even though every current
   * caller already sources `id` from a hospital_id-scoped lookup (getTodaysPrescriptionForPatient)
   * — repository methods must self-scope rather than rely on callers always being careful
   * (this was found missing during review and fixed before commit).
   */
  async updatePrescriptionById(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .update(patch)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown>;
  }

  /** Batch-insert InvoiceItem rows. No-op when items array is empty. */
  async insertInvoiceItems(items: Record<string, unknown>[]): Promise<void> {
    if (items.length === 0) return;
    const { error } = await this.supabase.from('InvoiceItem').insert(items);
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /** Insert a single Payment record. */
  async insertPayment(payment: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from('Payment').insert(payment);
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /**
   * Fetch a service template by UUID id.
   * Returns null when not found.
   */
  async getServiceTemplateById(id: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase
      .from('ServiceTemplate')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown> | null;
  }

  // ============================================================
  // DROPDOWN OPTIONS
  // ============================================================

  /**
   * List dropdown options, optionally filtered by fieldName.
   * When fieldName is omitted, all options for this hospital are returned.
   */
  async listDropdownOptions(fieldName?: string): Promise<Record<string, unknown>[]> {
    let query = this.supabase
      .from('DropdownOption')
      .select('id, fieldName, value')
      .eq('hospital_id', this.hospitalId)
      .order('value', { ascending: true });

    if (fieldName) {
      query = query.eq('fieldName', fieldName);
    }

    const { data, error } = await query;
    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return (data ?? []) as Record<string, unknown>[];
  }

  /**
   * Check whether a dropdown option with the given fieldName + value already exists
   * for this hospital. Used to implement upsert semantics in addDropdownOption.
   */
  async dropdownOptionExists(fieldName: string, value: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('DropdownOption')
      .select('id')
      .eq('fieldName', fieldName)
      .eq('value', value)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data !== null;
  }

  /** Insert a new dropdown option. hospital_id is injected. Returns the created row. */
  async insertDropdownOption(
    fieldName: string,
    value: string,
    createdBy: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('DropdownOption')
      .insert({ fieldName, value, createdBy, hospital_id: this.hospitalId })
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as Record<string, unknown>;
  }
}
