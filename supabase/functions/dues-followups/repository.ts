/**
 * DuesFollowupsRepository — data-access layer for the dues-followups Edge Function.
 *
 * This module owns no tables. It is a cross-table read aggregator that reads
 * from four billing tables (Prescription, InPatient, LabBill, PharmacyBill) to
 * compile outstanding dues, and writes back to those tables for the mark-paid
 * operation. Cross-table reads within this file are explicitly sanctioned by
 * the architecture (ADR-006 §8.10): dues-followups OWNS this aggregation view.
 *
 * hospital_id scoping: MANDATORY on every query (ADR-007).
 * HospitalProfile: NO hospital_id column — scope with .eq('id', hospitalId).
 * PII (names, phone, email): never appears in log calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DueRecord, FollowUpRecord, EmailTemplate } from './types.ts';
import { NotFoundError } from '../_shared/errors.ts';

/** Shared per-table due filters — matches main's getDues() filter set. */
export interface DueFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Per-table follow-up filters. dateFromISO/dateToISO are pre-computed full
 * ISO bounds (service.ts applies main's default-window logic — next 5 days,
 * or from 2000-01-01 when includeOverdue — before calling the repository).
 */
export interface FollowupFilters {
  notesSearch?: string;
  doctor?: string;
  department?: string;
  dateFromISO: string;
  dateToISO: string;
}

export class DuesFollowupsRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  // ─── Dues: OPD (Prescription with balanceDue > 0) ──────────────────────────

  async getAllOPDDues(filters: DueFilters = {}): Promise<DueRecord[]> {
    let query = this.supabase
      .from('Prescription')
      .select(`
        id,
        prescriptionNumber,
        total,
        amountPaid,
        balanceDue,
        prescriptionDate,
        items:InvoiceItem(description),
        patient:Patient!patientId(patientId, firstName, lastName, phone)
      `)
      .gt('balanceDue', 0)
      .eq('hospital_id', this.hospitalId)
      .order('prescriptionDate', { ascending: false });

    if (filters.dateFrom) query = query.gte('prescriptionDate', `${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) query = query.lte('prescriptionDate', `${filters.dateTo}T23:59:59`);
    if (filters.search) {
      const s = filters.search;
      query = query.or(
        `prescriptionNumber.ilike.%${s}%,patient.firstName.ilike.%${s}%,patient.lastName.ilike.%${s}%,patient.phone.ilike.%${s}%,patient.patientId.ilike.%${s}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((rx) => {
      const patient = rx.patient as {
        patientId: string;
        firstName: string;
        lastName: string;
        phone: string;
      } | null;
      if (!patient) return null;

      const items = (rx.items ?? []) as { description: string }[];
      const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
      return {
        id: rx.id,
        type: 'OPD' as const,
        patientId: patient.patientId,
        patientName,
        uhid: patient.patientId,
        phone: patient.phone,
        services: items.map((i) => i.description).join(', ') || 'Consultation',
        totalAmount: rx.total ?? 0,
        amountPaid: rx.amountPaid ?? 0,
        balanceDue: rx.balanceDue ?? 0,
        date: new Date(rx.prescriptionDate).toISOString(),
        prescriptionNumber: rx.prescriptionNumber ?? undefined,
      };
    }).filter((r): r is DueRecord => r !== null);
  }

  // ─── Dues: IPD (InPatient with balanceAmount > 0) ──────────────────────────

  async getAllIPDDues(filters: DueFilters = {}): Promise<DueRecord[]> {
    let query = this.supabase
      .from('InPatient')
      .select(`
        id,
        name,
        phone,
        netAmount,
        totalReceivedAmount,
        balanceAmount,
        admissionDate,
        operationName,
        patient:Patient!patientId(patientId)
      `)
      .gt('balanceAmount', 0)
      .eq('hospital_id', this.hospitalId)
      .order('admissionDate', { ascending: false });

    if (filters.dateFrom) query = query.gte('admissionDate', `${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) query = query.lte('admissionDate', `${filters.dateTo}T23:59:59`);
    if (filters.search) {
      const s = filters.search;
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,ipNumber.ilike.%${s}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((ip) => {
      const patient = ip.patient as { patientId: string } | null;
      if (!patient) return null;

      return {
        id: ip.id,
        type: 'IPD' as const,
        patientId: patient.patientId,
        patientName: ip.name,
        uhid: patient.patientId,
        phone: ip.phone,
        services: ip.operationName || 'In-Patient Package',
        totalAmount: ip.netAmount ?? 0,
        amountPaid: ip.totalReceivedAmount ?? 0,
        balanceDue: ip.balanceAmount ?? 0,
        date: new Date(ip.admissionDate).toISOString(),
      };
    }).filter((r): r is DueRecord => r !== null);
  }

  // ─── Dues: LAB (LabBill with balanceDue > 0, not CANCELLED) ────────────────

  async getAllLABDues(filters: DueFilters = {}): Promise<DueRecord[]> {
    let query = this.supabase
      .from('LabBill')
      .select(`
        id,
        billNumber,
        total,
        amountPaid,
        balanceDue,
        createdAt,
        lab:Lab!labId(name),
        items:LabBillItem(name),
        patient:Patient!patientId(patientId, firstName, lastName, phone)
      `)
      .gt('balanceDue', 0)
      .neq('status', 'CANCELLED')
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false });

    if (filters.dateFrom) query = query.gte('createdAt', `${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) query = query.lte('createdAt', `${filters.dateTo}T23:59:59`);
    if (filters.search) {
      const s = filters.search;
      query = query.or(
        `billNumber.ilike.%${s}%,patient.firstName.ilike.%${s}%,patient.lastName.ilike.%${s}%,patient.phone.ilike.%${s}%,patient.patientId.ilike.%${s}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((lb) => {
      const patient = lb.patient as {
        patientId: string;
        firstName: string;
        lastName: string;
        phone: string;
      } | null;
      if (!patient) return null;

      const lab = lb.lab as { name: string } | null;
      const labName = lab?.name ?? 'Lab';
      const items = (lb.items ?? []) as { name: string }[];
      const services = items.length > 0
        ? `${labName}: ${items.map((i) => i.name).join(', ')}`
        : labName;

      const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
      return {
        id: lb.id,
        type: 'LAB' as const,
        patientId: patient.patientId,
        patientName,
        uhid: patient.patientId,
        phone: patient.phone,
        services,
        totalAmount: lb.total ?? 0,
        amountPaid: lb.amountPaid ?? 0,
        balanceDue: lb.balanceDue ?? 0,
        date: new Date(lb.createdAt).toISOString(),
        labBillNumber: lb.billNumber,
      };
    }).filter((r): r is DueRecord => r !== null);
  }

  // ─── Dues: PHARMACY (PharmacyBill with balanceDue > 0) ─────────────────────

  async getAllPharmacyDues(filters: DueFilters = {}): Promise<DueRecord[]> {
    let query = this.supabase
      .from('PharmacyBill')
      .select(`
        id,
        billNumber,
        patientId,
        patientName,
        patientPhone,
        billAmount,
        paidAmount,
        balanceDue,
        createdAt,
        items:PharmacyBillItem(medicineName)
      `)
      .gt('balanceDue', 0)
      .eq('hospital_id', this.hospitalId)
      .order('createdAt', { ascending: false });

    if (filters.dateFrom) query = query.gte('createdAt', `${filters.dateFrom}T00:00:00`);
    if (filters.dateTo) query = query.lte('createdAt', `${filters.dateTo}T23:59:59`);
    if (filters.search) {
      const s = filters.search;
      query = query.or(`billNumber.ilike.%${s}%,patientName.ilike.%${s}%,patientPhone.ilike.%${s}%,patientId.ilike.%${s}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((pb) => {
      const items = (pb.items ?? []) as { medicineName: string }[];
      return {
        id: pb.id,
        type: 'PHARMACY' as const,
        patientId: pb.patientId ?? '—',
        patientName: pb.patientName,
        uhid: pb.patientId ?? '—',
        phone: pb.patientPhone ?? '—',
        services: items.map((i) => i.medicineName).join(', ') || 'Medicines',
        totalAmount: pb.billAmount ?? 0,
        amountPaid: pb.paidAmount ?? 0,
        balanceDue: pb.balanceDue ?? 0,
        date: new Date(pb.createdAt).toISOString(),
        pharmacyBillNumber: pb.billNumber,
      };
    });
  }

  // ─── Follow-ups: OPD (Prescription with non-null followUpDate) ─────────────

  async getAllOPDFollowups(filters: FollowupFilters): Promise<FollowUpRecord[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let query = this.supabase
      .from('Prescription')
      .select(`
        id,
        followUpDate,
        prescriptionDate,
        doctorName,
        department,
        diagnosis,
        additionalNotes,
        patient:Patient!patientId(patientId, firstName, lastName, phone, email)
      `)
      .not('followUpDate', 'is', null)
      .eq('hospital_id', this.hospitalId)
      .gte('followUpDate', filters.dateFromISO)
      .lte('followUpDate', filters.dateToISO)
      .order('followUpDate', { ascending: true });

    if (filters.notesSearch) query = query.ilike('additionalNotes', `%${filters.notesSearch}%`);
    if (filters.doctor) query = query.ilike('doctorName', `%${filters.doctor}%`);
    if (filters.department) query = query.eq('department', filters.department);

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((rx) => {
      const patient = rx.patient as {
        patientId: string;
        firstName: string;
        lastName: string;
        phone: string;
        email: string | null;
      } | null;
      if (!patient || !rx.followUpDate) return null;

      const fuDate = new Date(rx.followUpDate);
      const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ');
      return {
        id: rx.id,
        type: 'OPD' as const,
        patientId: patient.patientId,
        patientName,
        uhid: patient.patientId,
        phone: patient.phone,
        email: patient.email ?? null,
        followUpDate: fuDate.toISOString(),
        doctorName: rx.doctorName ?? '—',
        department: rx.department ?? '—',
        diagnosis: rx.diagnosis ?? '—',
        additionalNotes: rx.additionalNotes ?? '',
        lastVisitDate: new Date(rx.prescriptionDate).toISOString(),
        isOverdue: fuDate < today,
      };
    }).filter((r): r is FollowUpRecord => r !== null);
  }

  // ─── Follow-ups: IPD (InPatient with non-null followUpDate) ────────────────

  async getAllIPDFollowups(filters: FollowupFilters): Promise<FollowUpRecord[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let query = this.supabase
      .from('InPatient')
      .select(`
        id,
        name,
        phone,
        followUpDate,
        admissionDate,
        dischargeDate,
        doctorNames,
        department,
        provisionDiagnosis,
        operationName,
        dischargeNotes,
        patient:Patient!patientId(patientId, email)
      `)
      .not('followUpDate', 'is', null)
      .eq('hospital_id', this.hospitalId)
      .gte('followUpDate', filters.dateFromISO)
      .lte('followUpDate', filters.dateToISO)
      .order('followUpDate', { ascending: true });

    if (filters.notesSearch) query = query.ilike('dischargeNotes', `%${filters.notesSearch}%`);
    if (filters.doctor) query = query.ilike('doctorNames', `%${filters.doctor}%`);
    if (filters.department) query = query.eq('department', filters.department);

    const { data, error } = await query;

    if (error) throw error;

    return (data ?? []).map((ip) => {
      const patient = ip.patient as { patientId: string; email: string | null } | null;
      if (!patient || !ip.followUpDate) return null;

      const fuDate = new Date(ip.followUpDate);

      let doctorName = '—';
      try {
        const names = JSON.parse(ip.doctorNames ?? '[]') as string[];
        if (names.length > 0) doctorName = names.join(', ');
      } catch {
        if (ip.doctorNames) doctorName = ip.doctorNames;
      }

      const lastVisitDate = ip.dischargeDate ?? ip.admissionDate;
      return {
        id: ip.id,
        type: 'IPD' as const,
        patientId: patient.patientId,
        patientName: ip.name,
        uhid: patient.patientId,
        phone: ip.phone,
        email: patient.email ?? null,
        followUpDate: fuDate.toISOString(),
        doctorName,
        department: ip.department ?? '—',
        diagnosis: ip.provisionDiagnosis ?? ip.operationName ?? '—',
        additionalNotes: ip.dischargeNotes ?? '',
        lastVisitDate: new Date(lastVisitDate).toISOString(),
        isOverdue: fuDate < today,
      };
    }).filter((r): r is FollowUpRecord => r !== null);
  }

  // ─── Mark Paid: look up records (scoped to hospital for cross-tenant safety) ─

  async findPrescriptionForPaid(id: string): Promise<{
    id: string;
    total: number;
    balanceDue: number;
    amountPaid: number;
    paymentMode: string | null;
  }> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('id, total, balanceDue, amountPaid, paymentMode')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Prescription', id);
    return data as {
      id: string;
      total: number;
      balanceDue: number;
      amountPaid: number;
      paymentMode: string | null;
    };
  }

  async markPrescriptionPaid(
    id: string,
    total: number,
    paymentMode: string,
    userId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('Prescription')
      .update({ amountPaid: total, balanceDue: 0, updatedBy: userId })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw error;
  }

  async insertPayment(data: {
    id: string;
    prescriptionId: string;
    amount: number;
    paymentMode: string;
    receivedBy: string;
  }): Promise<void> {
    // Payment is a child table of Prescription — no hospital_id column (excluded in migration).
    const { error } = await this.supabase
      .from('Payment')
      .insert(data);

    if (error) throw error;
  }

  async findInpatientForPaid(id: string): Promise<{
    id: string;
    netAmount: number;
    balanceAmount: number;
    paymentRecords: string | null;
    updatedBy: string | null;
  }> {
    const { data, error } = await this.supabase
      .from('InPatient')
      .select('id, netAmount, balanceAmount, paymentRecords, updatedBy')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('InPatient', id);
    return data as {
      id: string;
      netAmount: number;
      balanceAmount: number;
      paymentRecords: string | null;
      updatedBy: string | null;
    };
  }

  async markInpatientPaid(
    id: string,
    netAmount: number,
    paymentRecords: string,
    userId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('InPatient')
      .update({
        totalReceivedAmount: netAmount,
        balanceAmount: 0,
        paymentRecords,
        updatedBy: userId,
      })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw error;
  }

  async findLabBillForPaid(id: string): Promise<{
    id: string;
    total: number;
    balanceDue: number;
    amountPaid: number;
    paymentMode: string | null;
  }> {
    const { data, error } = await this.supabase
      .from('LabBill')
      .select('id, total, balanceDue, amountPaid, paymentMode')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('LabBill', id);
    return data as {
      id: string;
      total: number;
      balanceDue: number;
      amountPaid: number;
      paymentMode: string | null;
    };
  }

  async markLabBillPaid(
    id: string,
    total: number,
    paymentMode: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('LabBill')
      .update({
        amountPaid: total,
        balanceDue: 0,
        status: 'PAID',
        paymentMode,
        paymentDate: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw error;
  }

  async insertLabPayment(data: {
    id: string;
    labBillId: string;
    amount: number;
    paymentMode: string;
    receivedBy: string;
  }): Promise<void> {
    // LabPayment is a child table of LabBill — no hospital_id column (excluded in migration).
    const { error } = await this.supabase
      .from('LabPayment')
      .insert(data);

    if (error) throw error;
  }

  async findPharmacyBillForPaid(id: string): Promise<{
    id: string;
    billAmount: number;
    balanceDue: number;
    paidAmount: number;
  }> {
    const { data, error } = await this.supabase
      .from('PharmacyBill')
      .select('id, billAmount, balanceDue, paidAmount')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('PharmacyBill', id);
    return data as {
      id: string;
      billAmount: number;
      balanceDue: number;
      paidAmount: number;
    };
  }

  async markPharmacyBillPaid(id: string, billAmount: number): Promise<void> {
    const { error } = await this.supabase
      .from('PharmacyBill')
      .update({
        paidAmount: billAmount,
        balanceDue: 0,
        status: 'COMPLETED',
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw error;
  }

  // ─── Doctor / department lists (for follow-up filtering dropdowns) ──────────

  async getDistinctDoctorNames(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('doctorName')
      .eq('hospital_id', this.hospitalId)
      .not('doctorName', 'is', null);

    if (error) throw error;
    const names = (data ?? []).map((d) => d.doctorName as string);
    return [...new Set(names)].filter(Boolean).sort();
  }

  async getDistinctDepartments(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('Prescription')
      .select('department')
      .eq('hospital_id', this.hospitalId)
      .not('department', 'is', null);

    if (error) throw error;
    const depts = (data ?? []).map((d) => d.department as string);
    return [...new Set(depts)].filter(Boolean).sort();
  }

  // ─── Hospital profile (for display name) ────────────────────────────────────
  // CRITICAL: HospitalProfile has NO hospital_id column.
  // Its own `id` IS the hospital identifier. Use .eq('id', hospitalId) always.

  async getHospitalProfile(): Promise<{ displayName: string | null; name: string }> {
    const { data, error } = await this.supabase
      .from('HospitalProfile')
      .select('id, displayName, name')
      .eq('id', this.hospitalId)
      .single();

    if (error) throw error;
    return data as { displayName: string | null; name: string };
  }

  // ─── Patient lookup (for sendEmail — resolves UHID → email/name) ───────────

  async findPatientByUhid(uhid: string): Promise<{
    firstName: string;
    lastName: string | null;
    email: string | null;
  } | null> {
    const { data, error } = await this.supabase
      .from('Patient')
      .select('firstName, lastName, email')
      .eq('hospital_id', this.hospitalId)
      .eq('patientId', uhid)
      .maybeSingle();

    if (error) throw error;
    return data as { firstName: string; lastName: string | null; email: string | null } | null;
  }
}
