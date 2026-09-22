/**
 * ReportsRepository — data-access layer for the reports module.
 *
 * This module owns no tables. It is a read-aggregation + export module that reads from:
 *   Patient, Prescription, EyeReading, InPatient         — patient history
 *   LabBill, PharmacyBill, OpticalBill, InsuranceClaim   — billing / insurance exports
 *   Expense                                               — expense export
 *   HospitalProfile                                       — receipt printing
 *
 * Key FK relationships affecting query strategy:
 *   Prescription.patientId → Patient.patientId  (TEXT display ID, e.g. "P-2024-001")
 *   EyeReading.patientId   → Patient.patientId  (TEXT display ID)
 *   LabBill.patientId      → Patient.patientId  (TEXT display ID)
 *   InPatient.patientId    → Patient.id         (UUID — the internal primary key)
 *
 * When routes receive a Patient UUID (per openapi.yaml §patientId parameter), the service
 * calls findPatientById() first to obtain the display patientId, then passes the correct
 * ID to whichever query needs it.
 *
 * Export endpoints cap at 5000 rows (matching old data/actions.ts .limit(5000)).
 * Every query is scoped by hospital_id per ADR-007.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExportQuery } from './types.ts';

type DateRange = { start: Date; end: Date };

/** Internal type: minimum patient fields needed for cross-table ID resolution. */
interface PatientBasic {
  id: string;
  /** Display sequential ID, e.g. "P-2024-0001". FK for Prescription/EyeReading/LabBill. */
  patientId: string;
}

export class ReportsRepository {
  constructor(private readonly supabase: SupabaseClient, private readonly hospitalId: string) {}

  // ─── Patient Search ───────────────────────────────────────────────────────────

  async searchPatients(q: string | undefined, offset: number, limit: number) {
    let query = this.supabase
      .from('Patient')
      .select(
        'id, patientId, firstName, lastName, phone, age, gender, dateOfBirth, patientType, appointmentDate, createdAt, prescriptions:Prescription(prescriptionDate)',
      )
      .eq('hospital_id', this.hospitalId)
      .order('updatedAt', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply ilike filter only when search term is provided and meaningful.
    // Empty-query returns paginated patient list (useful for report-building).
    if (q && q.length >= 2) {
      query = query.or(
        `patientId.ilike.%${q}%,phone.ilike.%${q}%,firstName.ilike.%${q}%,lastName.ilike.%${q}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Patient ID resolution (UUID → display patientId) ────────────────────────

  /**
   * Find a patient by internal UUID. Returns { id, patientId } for use as the
   * join key when querying Prescription / EyeReading / LabBill (which FK to the
   * display patientId text), or the UUID for InPatient (which FK to Patient.id).
   */
  async findPatientById(id: string): Promise<PatientBasic | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('id, patientId')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data as PatientBasic;
  }

  // ─── Patient Summary ──────────────────────────────────────────────────────────

  /**
   * Returns the full patient row with nested aggregates for computing summary stats.
   * Uses the UUID (Patient.id) for the primary filter; PostgREST follows FK constraints
   * to join Prescription/LabBill (via Patient.patientId) and InPatient (via Patient.id).
   */
  async getPatientSummaryData(id: string) {
    const { data, error } = await this.supabase
      .from('Patient')
      .select(
        '*, prescriptions:Prescription(id, total, amountPaid, balanceDue, prescriptionDate, status), labBills:LabBill(total, amountPaid, balanceDue), inpatient:InPatient(netAmount, totalReceivedAmount, balanceAmount, status)',
      )
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  // ─── Visit History ────────────────────────────────────────────────────────────

  async getPatientVisits(displayPatientId: string) {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select(
        'id, prescriptionNumber, prescriptionDate, doctorName, department, presentComplaint, diagnosis, status, patientType, total, amountPaid, balanceDue, followUpDate',
      )
      .eq('patientId', displayPatientId)
      .eq('hospital_id', this.hospitalId)
      .order('prescriptionDate', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ─── Prescriptions with items ─────────────────────────────────────────────────

  async getPatientPrescriptions(displayPatientId: string) {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select(
        'id, prescriptionNumber, prescriptionDate, doctorName, department, presentComplaint, previousHistory, diagnosis, medicines, investigations, additionalNotes, followUpDate, status, patientType, items:InvoiceItem(id, description, category, quantity, unitPrice, amount, sortOrder)',
      )
      .eq('patientId', displayPatientId)
      .eq('hospital_id', this.hospitalId)
      .order('prescriptionDate', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ─── InPatient Records ────────────────────────────────────────────────────────

  /**
   * InPatient.patientId is a FK to Patient.id (UUID) — unlike Prescription/LabBill
   * which FK to Patient.patientId (display text). Query directly by UUID.
   */
  async getPatientInpatient(uuid: string) {
    const { data, error } = await this.supabase
      .from('InPatient')
      .select(
        '*, insuranceClaims:InsuranceClaim(id, claimNumber, insuranceCompanyName, status, totalApprovedAmount, finalSettledAmount)',
      )
      .eq('patientId', uuid)
      .eq('hospital_id', this.hospitalId)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  // ─── Receipt data ─────────────────────────────────────────────────────────────

  /**
   * Parallel: Patient (by UUID) with all nested receipt data + HospitalProfile.
   * HospitalProfile uses .eq('id', hospitalId) — NOT .limit(1) — to avoid the
   * known ADR-007 bug where the wrong hospital's profile could be returned.
   */
  async getPatientReceiptData(uuid: string) {
    const [patientResult, hospitalResult] = await Promise.all([
      this.supabase
        .from('Patient')
        .select(
          '*, eyeReadings:EyeReading(*), prescriptions:Prescription(*, items:InvoiceItem(*), payments:Payment(*))',
        )
        .eq('id', uuid)
        .eq('hospital_id', this.hospitalId)
        .single(),
      this.supabase
        .from('HospitalProfile')
        .select('*')
        .eq('id', this.hospitalId)
        .single(),
    ]);

    if (patientResult.error && patientResult.error.code !== 'PGRST116') {
      throw patientResult.error;
    }
    return {
      patient: patientResult.data ?? null,
      hospital: hospitalResult.data ?? null,
    };
  }

  // ─── Lab Records ──────────────────────────────────────────────────────────────

  async getPatientLabRecords(displayPatientId: string) {
    const { data, error } = await this.supabase
      .from('LabBill')
      .select(
        '*, lab:Lab(name, printHeaderKey), items:LabBillItem(id, name, amount, sortOrder), payments:LabPayment(id, amount, paymentMode, paymentDate)',
      )
      .eq('patientId', displayPatientId)
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  // ─── Billing Overview ─────────────────────────────────────────────────────────

  /**
   * Three parallel queries:
   *   Prescription — filtered by display patientId (TEXT FK)
   *   LabBill      — filtered by display patientId (TEXT FK)
   *   InPatient    — filtered by UUID (UUID FK)
   */
  async getPatientBillingData(displayPatientId: string, uuid: string) {
    const [prescriptionsRes, labBillsRes, inpatientRes] = await Promise.all([
      this.supabase
        .from('Prescription')
        .select(
          'id, prescriptionNumber, prescriptionDate, total, amountPaid, balanceDue, status, paymentMode, payments:Payment(id, amount, paymentMode, paymentDate, notes)',
        )
        .eq('patientId', displayPatientId)
        .eq('hospital_id', this.hospitalId)
        .order('prescriptionDate', { ascending: false }),
      this.supabase
        .from('LabBill')
        .select(
          'id, billNumber, total, amountPaid, balanceDue, status, createdAt, lab:Lab(name), payments:LabPayment(id, amount, paymentMode, paymentDate)',
        )
        .eq('patientId', displayPatientId)
        .eq('hospital_id', this.hospitalId)
        .order('createdAt', { ascending: false }),
      this.supabase
        .from('InPatient')
        .select(
          'ipNumber, packageAmount, discount, netAmount, totalReceivedAmount, balanceAmount, paymentRecords, status, admissionDate, dischargeDate',
        )
        .eq('patientId', uuid)
        .eq('hospital_id', this.hospitalId)
        .single(),
    ]);

    if (prescriptionsRes.error) throw prescriptionsRes.error;
    if (labBillsRes.error) throw labBillsRes.error;

    const inpatient = inpatientRes.error?.code === 'PGRST116'
      ? null
      : inpatientRes.error
        ? (() => { throw inpatientRes.error; })()
        : inpatientRes.data;

    return {
      prescriptions: prescriptionsRes.data ?? [],
      labBills: labBillsRes.data ?? [],
      inpatient,
    };
  }

  // ─── Export: Patients ─────────────────────────────────────────────────────────

  async exportPatients(range: DateRange | null, search?: string, patientType?: string) {
    let q = this.supabase
      .from('Patient')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (patientType && patientType !== 'ALL') q = q.eq('patientType', patientType);
    if (range) {
      q = q
        .gte('appointmentDate', range.start.toISOString())
        .lt('appointmentDate', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(
        `firstName.ilike.%${s}%,lastName.ilike.%${s}%,phone.ilike.%${s}%,patientId.ilike.%${s}%`,
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Prescriptions ────────────────────────────────────────────────────

  async exportPrescriptions(range: DateRange | null, search?: string, status?: string) {
    let q = this.supabase
      .from('Prescription')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (status && status !== 'ALL') q = q.eq('status', status);
    if (range) {
      q = q
        .gte('prescriptionDate', range.start.toISOString())
        .lt('prescriptionDate', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(
        `prescriptionNumber.ilike.%${s}%,doctorName.ilike.%${s}%,patientId.ilike.%${s}%`,
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Eye Readings ─────────────────────────────────────────────────────

  /**
   * EyeReading has hospital_id (added by the hospital_id_backfill migration).
   * Scope directly without a Patient join.
   */
  async exportEyeReadings(range: DateRange | null, search?: string) {
    let q = this.supabase
      .from('EyeReading')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (range) {
      q = q
        .gte('readingDate', range.start.toISOString())
        .lt('readingDate', range.end.toISOString());
    }
    if (search) q = q.ilike('patientId', `%${search.trim()}%`);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: InPatients ───────────────────────────────────────────────────────

  async exportInpatients(range: DateRange | null, search?: string, status?: string) {
    let q = this.supabase
      .from('InPatient')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (status && status !== 'ALL') q = q.eq('status', status);
    if (range) {
      q = q
        .gte('admissionDate', range.start.toISOString())
        .lt('admissionDate', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(`name.ilike.%${s}%,ipNumber.ilike.%${s}%,phone.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Insurance Claims ─────────────────────────────────────────────────

  async exportInsuranceClaims(range: DateRange | null, search?: string, status?: string) {
    let q = this.supabase
      .from('InsuranceClaim')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (status && status !== 'ALL') q = q.eq('status', status);
    if (range) {
      q = q
        .gte('createdAt', range.start.toISOString())
        .lt('createdAt', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(
        `claimNumber.ilike.%${s}%,patientName.ilike.%${s}%,insuranceCompanyName.ilike.%${s}%`,
      );
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Lab Bills ────────────────────────────────────────────────────────

  async exportLabBills(range: DateRange | null, search?: string, status?: string) {
    let q = this.supabase
      .from('LabBill')
      .select('*, lab:Lab(name)')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (status && status !== 'ALL') q = q.eq('status', status);
    if (range) {
      q = q
        .gte('createdAt', range.start.toISOString())
        .lt('createdAt', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(`billNumber.ilike.%${s}%,patientId.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Pharmacy Bills ───────────────────────────────────────────────────

  async exportPharmacyBills(range: DateRange | null, search?: string) {
    let q = this.supabase
      .from('PharmacyBill')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (range) {
      q = q
        .gte('billDate', range.start.toISOString())
        .lt('billDate', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(`billNumber.ilike.%${s}%,patientName.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Optical Bills ────────────────────────────────────────────────────

  async exportOpticalBills(range: DateRange | null, search?: string) {
    let q = this.supabase
      .from('OpticalBill')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (range) {
      q = q
        .gte('billDate', range.start.toISOString())
        .lt('billDate', range.end.toISOString());
    }
    if (search) {
      const s = search.trim();
      q = q.or(`billNumber.ilike.%${s}%,patientName.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  // ─── Export: Expenses ─────────────────────────────────────────────────────────

  async exportExpenses(range: DateRange | null, search?: string) {
    let q = this.supabase
      .from('Expense')
      .select('*, category:ExpenseCategory(name)')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false })
      .limit(5000);

    if (range) {
      q = q.gte('date', range.start.toISOString()).lt('date', range.end.toISOString());
    }
    if (search) q = q.ilike('title', `%${search.trim()}%`);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }
}
