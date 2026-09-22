/**
 * AI context builders for the doctor/ai/ask endpoint.
 *
 * Two modes:
 *   1. Patient-clinical: resolves a patient from patientId or free-text token,
 *      builds a structured brief of visits, dues, refractions, labs, IPD,
 *      optical, pharmacy.
 *   2. Analytics: builds a hospital-level brief of revenue, dues, expenses,
 *      doctor performance, top services, demographics, trends.
 *
 * All Supabase queries are scoped by hospital_id (ADR-007). The supabase client
 * uses the service_role key; hospital_id scoping is therefore mandatory, not
 * optional. PII rules: patient name and patientId are included in the patient
 * brief (they are the clinical anchor); phone, email, address, guardian contacts
 * are NEVER included. Doctor names appear in analytics briefs — they are staff
 * identifiers already visible in reports. No PII is logged.
 *
 * Ported from src/app/(hospital)/doctor/ai-actions.ts. Cross-module analytics
 * query functions (getAnalyticsOverview, getTimeSeries, etc.) cannot be imported
 * here (no cross-module imports — ADR-006). Instead, a lean set of direct
 * Supabase queries assembles exactly what the analytics brief uses. The query
 * logic is intentionally simpler than the full analytics module — the brief is
 * a human-readable text summary, not a financial report, so minor approximations
 * (e.g. "last 30 days" instead of calendar-month) are acceptable.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── AskInput type (mirrors the validated body from types.ts) ──────────────────

export type AiInput = {
  patientId?: string | null;
  question: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  module?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_HISTORY_TURNS = 6;

const VISITS_CAP       = 10;
const REFRACTIONS_CAP  = 5;
const LAB_BILLS_CAP    = 10;
const OPTICAL_CAP      = 5;
const PHARMACY_CAP     = 5;
const TEXT_FIELD_MAX   = 220;

// ── Row types (minimal — only fields actually used in the brief) ──────────────

type RxRow = {
  id: string;
  prescriptionDate: string;
  status: string;
  doctorName: string | null;
  diagnosis: string | null;
  presentComplaint: string | null;
  medicines: string | null;
  investigations: string | null;
  followUpDate: string | null;
  temperature: number | null;
  pulseRate: number | null;
  spo2: number | null;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMode: string | null;
  createdAt: string;
  items?: Array<{ description: string; amount: number }>;
  payments?: Array<{ amount: number; paymentMode: string | null; paymentDate: string | null }>;
};

type EyeReadingRow = {
  presentPrescription: string | null;
  autoRefractometer: string | null;
  readingDate: string;
  createdAt: string;
};

type InPatientRow = {
  id: string;
  ipNumber: string;
  admissionDate: string;
  operationName: string | null;
  operationDate: string | null;
  doctorNames: string | null;
  netAmount: number;
  totalReceivedAmount: number;
  balanceAmount: number;
  provisionDiagnosis: string | null;
  insuranceClaims?: Array<{
    claimNumber: string;
    insuranceCompanyName: string | null;
    totalBillAmount: number | null;
    totalApprovedAmount: number | null;
    finalSettledAmount: number | null;
    patientBalance: number | null;
    status: string;
    operationName: string | null;
  }>;
};

type LabBillRow = {
  billNumber: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  createdAt: string;
  items?: Array<{ name: string; amount: number }>;
};

type OpticalBillRow = {
  billNumber: string;
  billDate: string;
  netAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  lensPrescription: string | null;
  deliveryDate: string | null;
};

type PharmacyBillRow = {
  billNumber: string;
  billDate: string;
  netAmount: number;
  paidAmount: number;
  items?: Array<{ medicineName?: string; quantity?: number }>;
};

// ── Formatting helpers ────────────────────────────────────────────────────────

function isoDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-IN');
}

function pct(value: number, total: number): string {
  if (!total || !Number.isFinite(value) || !Number.isFinite(total)) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

function trunc(s: string, max: number): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function formatVitals(rx: { temperature: number | null; pulseRate: number | null; spo2: number | null }): string | null {
  const parts: string[] = [];
  if (rx.temperature != null) parts.push(`Temp ${rx.temperature}°F`);
  if (rx.pulseRate   != null) parts.push(`Pulse ${rx.pulseRate} bpm`);
  if (rx.spo2        != null) parts.push(`SpO₂ ${rx.spo2}%`);
  return parts.length ? parts.join(' · ') : null;
}

function parseMedicines(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as Array<{ name?: string; days?: string; timing?: string }>;
    return arr
      .map((m) => {
        const name = (m?.name ?? '').trim();
        if (!name) return '';
        const timing = (m?.timing ?? '').trim();
        const days   = (m?.days   ?? '').trim();
        const suffix = [timing, days ? `× ${days}` : ''].filter(Boolean).join(' ');
        return suffix ? `${name} (${suffix})` : name;
      })
      .filter(Boolean);
  } catch { return []; }
}

function parseInvestigations(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as Array<{ name?: string }>;
    return arr.map((i) => (i?.name ?? '').trim()).filter(Boolean);
  } catch { return []; }
}

function parseDoctorNames(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as string[];
    return arr.filter(Boolean);
  } catch { return []; }
}

function summariseRefraction(json: string): string | null {
  try {
    const sr = JSON.parse(json) as {
      re?: { sph?: string; cyl?: string; axis?: string; add?: string; va?: string };
      le?: { sph?: string; cyl?: string; axis?: string; add?: string; va?: string };
      sightType?: string;
    };
    const fmt = (e?: { sph?: string; cyl?: string; axis?: string; add?: string; va?: string }) => {
      if (!e) return '—';
      let s = `${e.sph || 'PL'} / ${e.cyl || 'DS'} × ${e.axis || '0'}`;
      if (e.add) s += ` add ${e.add}`;
      if (e.va)  s += ` VA ${e.va}`;
      return s;
    };
    let out = `RE ${fmt(sr.re)} | LE ${fmt(sr.le)}`;
    if (sr.sightType) out += ` | type ${sr.sightType}`;
    return out;
  } catch { return null; }
}

function futureFollowUp(rxs: RxRow[]): string | null {
  const now = Date.now();
  const upcoming = rxs
    .map((r) => (r.followUpDate ? new Date(r.followUpDate).getTime() : null))
    .filter((t): t is number => t !== null && t >= now)
    .sort((a, b) => a - b);
  if (!upcoming.length) return null;
  return new Date(upcoming[0]).toISOString();
}

// ── IST day bounds (inline — no Next.js dependency) ──────────────────────────

function getISTDayBounds(): { start: Date; end: Date } {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return {
    start: new Date(d + 'T00:00:00+05:30'),
    end:   new Date(d + 'T23:59:59.999+05:30'),
  };
}

function withinDay(dateStr: string, bounds: { startMs: number; endMs: number }): boolean {
  const t = new Date(dateStr).getTime();
  return t >= bounds.startMs && t <= bounds.endMs;
}

// ── Token extraction ──────────────────────────────────────────────────────────

/**
 * Pull the most likely patient identifier out of free-form text.
 * Priority: 10-digit phone > formatted UID (P-0005) > bare digit sequence.
 */
export function extractPatientToken(text: string): string | null {
  if (!text) return null;
  // Normalise unicode dashes.
  const blob = text.replace(/[‐-―]/g, '-');
  // 10-digit phone (optional +91 prefix).
  const phone = blob.match(/(?:\+?91)?[\s-]?([6-9]\d{9})\b/);
  if (phone) return phone[1];
  // UID with leading letters and digits.
  const uid = blob.match(/\b[A-Za-z]{1,5}-?\d{3,7}\b/);
  if (uid) return uid[0];
  // Bare digit sequence (3–7 digits).
  const digits = blob.match(/\b\d{3,7}\b/);
  if (digits) return digits[0];
  return null;
}

// ── Patient token resolver ────────────────────────────────────────────────────

/**
 * Resolve a free-form token to a Patient.patientId.
 * Scoped by hospital_id (ADR-007). Returns null if not found.
 */
async function findPatientByToken(
  supabase: SupabaseClient,
  hospitalId: string,
  token: string,
): Promise<string | null> {
  const cleaned = token.trim();
  if (!cleaned) return null;

  type Variant = { field: 'patientId' | 'phone'; pattern: string };
  const variants: Variant[] = [];

  // 10-digit phone — match trailing 10 digits (handles stored +91 prefixes).
  if (/^\d{10}$/.test(cleaned)) {
    variants.push({ field: 'phone', pattern: `%${cleaned}` });
  }

  if (/^[A-Za-z0-9-]+$/.test(cleaned)) {
    variants.push({ field: 'patientId', pattern: `%${cleaned}%` });
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly && digitsOnly !== cleaned) {
      variants.push({ field: 'patientId', pattern: `%${digitsOnly}%` });
    }
  }

  for (const v of variants) {
    const { data } = await supabase
      .from('Patient')
      .select('patientId')
      .eq('hospital_id', hospitalId)
      .ilike(v.field, v.pattern)
      .limit(1)
      .maybeSingle();
    if ((data as { patientId?: string } | null)?.patientId) {
      return (data as { patientId: string }).patientId;
    }
  }

  return null;
}

// ── Patient context builder ───────────────────────────────────────────────────

/**
 * Build a structured text brief for a single patient.
 *
 * PII policy: name + patientId are included (clinical anchors). Phone, email,
 * address, guardian contact are excluded. Doctor names appear as written in
 * the prescription (staff identifiers, already visible to all clinical staff).
 *
 * Ported from buildPatientContext() in src/app/(hospital)/doctor/ai-actions.ts,
 * with hospital_id scoping added to every query (ADR-007).
 */
export async function buildPatientContext(
  supabase: SupabaseClient,
  hospitalId: string,
  idOrPatientId: string,
): Promise<string> {
  const PATIENT_SELECT =
    'id, patientId, firstName, lastName, age, dateOfBirth, gender, ' +
    'patientType, status, appointmentDate, createdAt, doctorName, ' +
    'department, referredBy, ' +
    'prescriptions:Prescription(' +
      'id, prescriptionDate, status, doctorName, diagnosis, presentComplaint, ' +
      'medicines, investigations, followUpDate, ' +
      'temperature, pulseRate, spo2, total, amountPaid, balanceDue, paymentMode, createdAt, ' +
      'items:InvoiceItem(description, amount), ' +
      'payments:Payment(amount, paymentMode, paymentDate)' +
    '), ' +
    'eyeReadings:EyeReading(presentPrescription, autoRefractometer, readingDate, createdAt)';

  // Try by human patientId first (OPD list), then by cuid (IPD list).
  let { data: patientRaw } = await supabase
    .from('Patient')
    .select(PATIENT_SELECT)
    .eq('hospital_id', hospitalId)
    .eq('patientId', idOrPatientId)
    .maybeSingle();

  if (!patientRaw) {
    const retry = await supabase
      .from('Patient')
      .select(PATIENT_SELECT)
      .eq('hospital_id', hospitalId)
      .eq('id', idOrPatientId)
      .maybeSingle();
    patientRaw = retry.data;
  }

  if (!patientRaw) return 'Patient brief unavailable.';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient = patientRaw as any;
  const humanPatientId: string = patient.patientId;

  // Side queries — parallel, all hospital_id-scoped (ADR-007).
  const [inpatientsRes, labBillsRes, opticalBillsRes, pharmacyBillsRes] = await Promise.all([
    supabase
      .from('InPatient')
      .select(
        'id, ipNumber, admissionDate, operationName, operationDate, doctorNames, ' +
        'netAmount, totalReceivedAmount, balanceAmount, ' +
        'provisionDiagnosis, ' +
        'insuranceClaims:InsuranceClaim(claimNumber, operationName, insuranceCompanyName, ' +
          'totalBillAmount, totalApprovedAmount, finalSettledAmount, patientBalance, status)',
      )
      .eq('hospital_id', hospitalId)
      .eq('patientId', patient.id)
      .order('admissionDate', { ascending: false }),

    supabase
      .from('LabBill')
      .select('billNumber, total, amountPaid, balanceDue, status, createdAt, items:LabBillItem(name, amount)')
      .eq('hospital_id', hospitalId)
      .eq('patientId', humanPatientId)
      .order('createdAt', { ascending: false })
      .limit(LAB_BILLS_CAP),

    supabase
      .from('OpticalBill')
      .select('billNumber, billDate, netAmount, paidAmount, balanceDue, status, lensPrescription, deliveryDate')
      .eq('hospital_id', hospitalId)
      .eq('patientId', humanPatientId)
      .order('billDate', { ascending: false })
      .limit(OPTICAL_CAP),

    supabase
      .from('PharmacyBill')
      .select('billNumber, billDate, netAmount, paidAmount, items:PharmacyBillItem(medicineName, quantity)')
      .eq('hospital_id', hospitalId)
      .eq('patientId', humanPatientId)
      .order('billDate', { ascending: false })
      .limit(PHARMACY_CAP),
  ]);

  const inpatients    = (inpatientsRes.data    ?? []) as InPatientRow[];
  const labBills      = (labBillsRes.data      ?? []) as LabBillRow[];
  const opticalBills  = (opticalBillsRes.data  ?? []) as OpticalBillRow[];
  const pharmacyBills = (pharmacyBillsRes.data ?? []) as PharmacyBillRow[];

  // ── Format ─────────────────────────────────────────────────────────────────
  const today = getISTDayBounds();
  const todayBounds = { startMs: today.start.getTime(), endMs: today.end.getTime() };
  const fullName = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() || '—';
  const age    = patient.age ?? '—';
  const gender = patient.gender ?? '—';

  const sortedRx: RxRow[] = ((patient.prescriptions ?? []) as RxRow[])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const todayRx  = sortedRx.find((rx) => withinDay(rx.prescriptionDate, todayBounds));
  const pastRx   = sortedRx.filter((rx) => !todayRx || rx.id !== todayRx.id);

  const eyeReadingsAll: EyeReadingRow[] = ((patient.eyeReadings ?? []) as EyeReadingRow[])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const lines: string[] = [];

  // ── PATIENT ──
  lines.push('=== PATIENT ===');
  lines.push(`Name: ${fullName}  (UID ${patient.patientId})`);
  lines.push(`Age: ${age}    Gender: ${gender}    Type: ${patient.patientType ?? 'OPD'}`);
  if (patient.createdAt) lines.push(`First registered: ${isoDate(patient.createdAt)}`);
  lines.push(`Total recorded visits: ${sortedRx.length}`);
  const lastPastRx = pastRx[0];
  if (lastPastRx) {
    const daysAgo = Math.max(0, Math.floor(
      (Date.now() - new Date(lastPastRx.prescriptionDate).getTime()) / 86400000,
    ));
    lines.push(`Last past visit: ${isoDate(lastPastRx.prescriptionDate)} (${daysAgo} day${daysAgo === 1 ? '' : 's'} ago)`);
  }
  const upcomingFollowUp = futureFollowUp(sortedRx);
  if (upcomingFollowUp) lines.push(`Next follow-up due: ${isoDate(upcomingFollowUp)}`);
  if (patient.referredBy)  lines.push(`Referred by: ${patient.referredBy}`);
  if (patient.department)  lines.push(`Primary department: ${patient.department}`);

  // ── TODAY ──
  lines.push('');
  lines.push('=== TODAY ===');
  lines.push(`Status: ${patient.status ?? '—'}`);
  if (todayRx) {
    if (todayRx.doctorName)       lines.push(`Doctor: ${todayRx.doctorName}`);
    if (todayRx.presentComplaint) lines.push(`Complaint: ${trunc(todayRx.presentComplaint, TEXT_FIELD_MAX)}`);
    if (todayRx.diagnosis)        lines.push(`Diagnosis: ${trunc(todayRx.diagnosis, TEXT_FIELD_MAX)}`);
    const vitals = formatVitals(todayRx);
    if (vitals) lines.push(`Vitals: ${vitals}`);
    const meds = parseMedicines(todayRx.medicines);
    if (meds.length) lines.push(`Current Rx: ${meds.slice(0, 10).join('; ')}`);
    const invs = parseInvestigations(todayRx.investigations);
    if (invs.length) lines.push(`Investigations ordered today: ${invs.slice(0, 8).join(', ')}`);
    if (todayRx.total > 0) {
      lines.push(
        `Today's bill: ₹${fmtMoney(todayRx.total)} | paid ₹${fmtMoney(todayRx.amountPaid)} | due ₹${fmtMoney(todayRx.balanceDue)}` +
        (todayRx.paymentMode ? ` (mode: ${todayRx.paymentMode})` : ''),
      );
    }
    if (todayRx.followUpDate) lines.push(`Follow-up planned: ${isoDate(todayRx.followUpDate)}`);
  } else {
    lines.push('No consultation recorded today yet.');
  }

  // ── DUES ──
  const opdDue    = sortedRx.reduce((s, r) => s + (r.balanceDue ?? 0), 0);
  const ipdDue    = inpatients.reduce((s, ip) => s + (ip.balanceAmount ?? 0), 0);
  const labDue    = labBills.reduce((s, l) => s + (l.balanceDue ?? 0), 0);
  const optDue    = opticalBills.reduce((s, o) => s + (o.balanceDue ?? 0), 0);
  const pharmDue  = pharmacyBills.reduce((s, p) => s + Math.max(0, (p.netAmount ?? 0) - (p.paidAmount ?? 0)), 0);
  const totalDue  = opdDue + ipdDue + labDue + optDue + pharmDue;

  lines.push('');
  lines.push('=== DUES (OUTSTANDING) ===');
  if (totalDue <= 0) {
    lines.push('No outstanding dues across any module.');
  } else {
    if (opdDue   > 0) lines.push(`OPD: ₹${fmtMoney(opdDue)}`);
    if (ipdDue   > 0) lines.push(`IPD: ₹${fmtMoney(ipdDue)}`);
    if (labDue   > 0) lines.push(`Lab: ₹${fmtMoney(labDue)}`);
    if (optDue   > 0) lines.push(`Optical: ₹${fmtMoney(optDue)}`);
    if (pharmDue > 0) lines.push(`Pharmacy: ₹${fmtMoney(pharmDue)}`);
    lines.push(`GRAND TOTAL DUE: ₹${fmtMoney(totalDue)}`);
  }

  // Lifetime billing snapshot.
  const opdBilled = sortedRx.reduce((s, r) => s + (r.total ?? 0), 0);
  const opdPaid   = sortedRx.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
  const ipdBilled = inpatients.reduce((s, ip) => s + (ip.netAmount ?? 0), 0);
  const ipdPaid   = inpatients.reduce((s, ip) => s + (ip.totalReceivedAmount ?? 0), 0);
  lines.push(`Lifetime OPD: billed ₹${fmtMoney(opdBilled)} | paid ₹${fmtMoney(opdPaid)}`);
  if (inpatients.length) {
    lines.push(`Lifetime IPD: billed ₹${fmtMoney(ipdBilled)} | paid ₹${fmtMoney(ipdPaid)}`);
  }

  // Payment-mode breakdown across all OPD payments.
  const modeMap = new Map<string, number>();
  for (const rx of sortedRx) {
    for (const p of (rx.payments ?? [])) {
      if (!p.amount) continue;
      const mode = (p.paymentMode ?? 'Other').trim() || 'Other';
      modeMap.set(mode, (modeMap.get(mode) ?? 0) + p.amount);
    }
  }
  if (modeMap.size) {
    const parts = Array.from(modeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m, a]) => `${m} ₹${fmtMoney(a)}`);
    lines.push(`OPD payments by mode: ${parts.join(', ')}`);
  }

  // ── OPD VISITS ──
  if (sortedRx.length) {
    lines.push('');
    lines.push(`=== OPD VISITS (last ${Math.min(sortedRx.length, VISITS_CAP)}) ===`);
    for (const rx of sortedRx.slice(0, VISITS_CAP)) {
      const date   = isoDate(rx.prescriptionDate);
      const doctor = rx.doctorName ? ` · Dr. ${rx.doctorName}` : '';
      const dx     = rx.diagnosis ? trunc(rx.diagnosis, 140) : '—';
      const meds   = parseMedicines(rx.medicines).slice(0, 6);
      const invs   = parseInvestigations(rx.investigations).slice(0, 6);
      const items  = (rx.items ?? []).slice(0, 6).map((it) => it.description).filter(Boolean);
      const bill   = rx.total > 0
        ? ` · Bill ₹${fmtMoney(rx.total)} (paid ₹${fmtMoney(rx.amountPaid)}, due ₹${fmtMoney(rx.balanceDue)})`
        : '';
      const follow = rx.followUpDate ? ` · Follow-up ${isoDate(rx.followUpDate)}` : '';
      lines.push(`[${date}]${doctor}: ${dx}${bill}${follow}`);
      if (rx.presentComplaint) lines.push(`    Complaint: ${trunc(rx.presentComplaint, 140)}`);
      if (meds.length)         lines.push(`    Meds: ${meds.join('; ')}`);
      if (invs.length)         lines.push(`    Investigations: ${invs.join(', ')}`);
      if (items.length)        lines.push(`    Services: ${items.join(', ')}`);
    }
    if (sortedRx.length > VISITS_CAP) {
      lines.push(`  …and ${sortedRx.length - VISITS_CAP} older visit(s) not shown.`);
    }
  }

  // ── REFRACTION HISTORY ──
  const refractionLines = eyeReadingsAll
    .map((er) => {
      const ref = er.presentPrescription ? summariseRefraction(er.presentPrescription) : null;
      return ref ? { date: isoDate(er.readingDate), summary: ref } : null;
    })
    .filter((x): x is { date: string; summary: string } => x !== null)
    .slice(0, REFRACTIONS_CAP);

  if (refractionLines.length) {
    lines.push('');
    lines.push(`=== REFRACTION HISTORY (last ${refractionLines.length}) ===`);
    for (const r of refractionLines) lines.push(`[${r.date}] ${r.summary}`);
  }

  // ── LAB BILLS ──
  if (labBills.length) {
    lines.push('');
    lines.push(`=== LAB BILLS (last ${labBills.length}) ===`);
    for (const lb of labBills) {
      const items = (lb.items ?? []).map((i) => i.name).filter(Boolean).slice(0, 6);
      lines.push(
        `[${isoDate(lb.createdAt)}] ${lb.billNumber} · ₹${fmtMoney(lb.total)} ` +
        `(paid ₹${fmtMoney(lb.amountPaid)}, due ₹${fmtMoney(lb.balanceDue)}) · ${lb.status}`,
      );
      if (items.length) lines.push(`    Tests: ${items.join(', ')}`);
    }
  }

  // ── IPD ──
  if (inpatients.length) {
    lines.push('');
    lines.push(`=== IPD ADMISSIONS (${inpatients.length}) ===`);
    for (const ip of inpatients) {
      const doctors = parseDoctorNames(ip.doctorNames);
      const opLine  = ip.operationName
        ? `${ip.operationName}${ip.operationDate ? ` on ${isoDate(ip.operationDate)}` : ''}`
        : 'Admitted';
      lines.push(
        `[${isoDate(ip.admissionDate)}] ${ip.ipNumber} · ${opLine}` +
        `${doctors.length ? ` · Dr. ${doctors.join(', Dr. ')}` : ''}`,
      );
      lines.push(
        `    Net ₹${fmtMoney(ip.netAmount)} | received ₹${fmtMoney(ip.totalReceivedAmount)} | balance ₹${fmtMoney(ip.balanceAmount)}`,
      );
      if (ip.provisionDiagnosis) lines.push(`    Provisional dx: ${trunc(ip.provisionDiagnosis, 140)}`);
      for (const c of (ip.insuranceClaims ?? [])) {
        const company  = c.insuranceCompanyName ? ` (${c.insuranceCompanyName})` : '';
        const billed   = c.totalBillAmount    ?? 0;
        const approved = c.totalApprovedAmount ?? 0;
        const settled  = c.finalSettledAmount  ?? 0;
        const balance  = c.patientBalance      ?? 0;
        lines.push(
          `    Insurance ${c.claimNumber}${company}: billed ₹${fmtMoney(billed)} · ` +
          `approved ₹${fmtMoney(approved)} · settled ₹${fmtMoney(settled)} · ` +
          `patient balance ₹${fmtMoney(balance)} · ${c.status}`,
        );
      }
    }
  }

  // ── OPTICAL ──
  if (opticalBills.length) {
    lines.push('');
    lines.push(`=== OPTICAL ORDERS (last ${opticalBills.length}) ===`);
    for (const ob of opticalBills) {
      const lens     = ob.lensPrescription ? summariseRefraction(ob.lensPrescription) : null;
      const delivery = ob.deliveryDate ? ` · delivery ${isoDate(ob.deliveryDate)}` : '';
      lines.push(
        `[${isoDate(ob.billDate)}] ${ob.billNumber} · ₹${fmtMoney(ob.netAmount)} ` +
        `(paid ₹${fmtMoney(ob.paidAmount)}, due ₹${fmtMoney(ob.balanceDue)}) · ${ob.status}${delivery}`,
      );
      if (lens) lines.push(`    Lens Rx: ${lens}`);
    }
  }

  // ── PHARMACY ──
  if (pharmacyBills.length) {
    lines.push('');
    lines.push(`=== PHARMACY (last ${pharmacyBills.length}) ===`);
    for (const pb of pharmacyBills) {
      const items = (pb.items ?? [])
        .map((i) => {
          const n = (i.medicineName ?? '').trim();
          if (!n) return '';
          return i.quantity && i.quantity > 1 ? `${n} × ${i.quantity}` : n;
        })
        .filter(Boolean)
        .slice(0, 6);
      lines.push(`[${isoDate(pb.billDate)}] ${pb.billNumber} · ₹${fmtMoney(pb.netAmount)} paid ₹${fmtMoney(pb.paidAmount)}`);
      if (items.length) lines.push(`    Items: ${items.join(', ')}`);
    }
  }

  return lines.join('\n');
}

// ── Analytics context builder ─────────────────────────────────────────────────
//
// Builds a hospital-level text brief: revenue/collection summary, dues,
// payment modes, IPD stats, top services, doctor performance, expense
// breakdown, 7-day trend, demographics, status distribution, referrals.
//
// Cross-module note: we cannot import from the analytics Edge Function
// (different deployment, different Deno module graph — ADR-006). Instead
// we run lean direct queries that assemble exactly what the brief needs.
// "Last 30 days" is used for the monthly period (matching the analytics
// module's 'month' filter of today − 30 days) and today's IST boundaries
// for the today period.
//
// All queries are scoped by hospital_id (ADR-007).

export async function buildAnalyticsContext(
  supabase: SupabaseClient,
  hospitalId: string,
): Promise<string> {
  const now          = new Date();
  const todayIST     = getISTDayBounds();
  const todayFrom    = todayIST.start.toISOString();
  const todayTo      = todayIST.end.toISOString();
  const monthAgo     = new Date(now.getTime() - 30 * 86_400_000);
  const monthFrom    = monthAgo.toISOString();
  const monthTo      = todayIST.end.toISOString();
  const monthName    = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // ── Parallel batch 1: patient counts + demographics ───────────────────────
  const [
    todayPatientsRes,
    monthPatientsRes,
    genderRes,
    ageRes,
    statusRes,
    referralRes,
  ] = await Promise.all([
    supabase.from('Patient').select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gte('appointmentDate', todayFrom).lte('appointmentDate', todayTo),

    supabase.from('Patient').select('gender, dateOfBirth, age, status, referredBy')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo),

    supabase.from('Patient').select('gender')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo),

    supabase.from('Patient').select('dateOfBirth, age')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo),

    supabase.from('Patient').select('status')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo),

    supabase.from('Patient').select('referredBy')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo)
      .not('referredBy', 'is', null),
  ]);

  // ── Parallel batch 2: revenue from billing tables ─────────────────────────
  const [
    rxTodayRes,
    rxMonthRes,
    labMonthRes,
    pharmMonthRes,
    opticalMonthRes,
    ipdMonthRes,
  ] = await Promise.all([
    supabase.from('Prescription').select('total, amountPaid, balanceDue, discount')
      .eq('hospital_id', hospitalId)
      .gte('prescriptionDate', todayFrom).lte('prescriptionDate', todayTo),

    supabase.from('Prescription').select('total, amountPaid, balanceDue, discount, doctorName')
      .eq('hospital_id', hospitalId)
      .gte('prescriptionDate', monthFrom).lte('prescriptionDate', monthTo),

    supabase.from('LabBill').select('total, amountPaid, balanceDue')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo),

    supabase.from('PharmacyBill').select('billAmount, paidAmount')
      .eq('hospital_id', hospitalId)
      .gte('billDate', monthFrom).lte('billDate', monthTo),

    supabase.from('OpticalBill').select('netAmount, paidAmount, balanceDue')
      .eq('hospital_id', hospitalId)
      .gte('billDate', monthFrom).lte('billDate', monthTo),

    supabase.from('InPatient').select('netAmount, totalReceivedAmount, balanceAmount, operationName, packageAmount')
      .eq('hospital_id', hospitalId)
      .gte('admissionDate', monthFrom).lte('admissionDate', monthTo),
  ]);

  // ── Parallel batch 3: expenses + top services + doctor perf + dues ─────────
  const [
    expenseMonthRes,
    invoiceItemMonthRes,
    paymentModesRes,
    opdDuesRes,
    ipdDuesRes,
    labDuesRes,
    optDuesRes,
    pharmDuesRes,
  ] = await Promise.all([
    supabase.from('Expense').select('amount, category:ExpenseCategory(name)')
      .eq('hospital_id', hospitalId)
      .gte('date', monthFrom).lte('date', monthTo),

    supabase.from('InvoiceItem').select('description, amount')
      .eq('hospital_id', hospitalId)
      .gte('createdAt', monthFrom).lte('createdAt', monthTo)
      .not('description', 'is', null),

    supabase.from('Payment').select('paymentMode, amount')
      .eq('hospital_id', hospitalId)
      .gte('paymentDate', monthFrom).lte('paymentDate', monthTo),

    supabase.from('Prescription').select('balanceDue').eq('hospital_id', hospitalId).gt('balanceDue', 0),
    supabase.from('InPatient').select('balanceAmount').eq('hospital_id', hospitalId).gt('balanceAmount', 0),
    supabase.from('LabBill').select('balanceDue').eq('hospital_id', hospitalId).gt('balanceDue', 0),
    supabase.from('OpticalBill').select('balanceDue').eq('hospital_id', hospitalId).gt('balanceDue', 0),
    supabase.from('PharmacyBill').select('billAmount, paidAmount').eq('hospital_id', hospitalId).gt('billAmount', 0),
  ]);

  // ── Parallel batch 4: 7-day time series ───────────────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const [weekRxRes, weekExpRes] = await Promise.all([
    supabase.from('Prescription').select('prescriptionDate, total, amountPaid')
      .eq('hospital_id', hospitalId)
      .gte('prescriptionDate', sevenDaysAgo.toISOString())
      .lte('prescriptionDate', monthTo),

    supabase.from('Expense').select('date, amount')
      .eq('hospital_id', hospitalId)
      .gte('date', sevenDaysAgo.toISOString())
      .lte('date', monthTo),
  ]);

  // ── Aggregations ──────────────────────────────────────────────────────────

  type SimpleRow = Record<string, number | string | null>;

  // Today
  const todayPatientCount = todayPatientsRes.count ?? 0;
  const rxToday = (rxTodayRes.data ?? []) as SimpleRow[];
  const todayBilled    = rxToday.reduce((s, r) => s + ((r.total as number) ?? 0), 0);
  const todayCollected = rxToday.reduce((s, r) => s + ((r.amountPaid as number) ?? 0), 0);

  // Month prescriptions
  const rxMonth = (rxMonthRes.data ?? []) as SimpleRow[];
  const monthRxBilled    = rxMonth.reduce((s, r) => s + ((r.total as number) ?? 0), 0);
  const monthRxCollected = rxMonth.reduce((s, r) => s + ((r.amountPaid as number) ?? 0), 0);
  const monthRxDiscount  = rxMonth.reduce((s, r) => s + ((r.discount as number) ?? 0), 0);

  // Month other billing modules
  const labMonth    = (labMonthRes.data    ?? []) as SimpleRow[];
  const pharmMonth  = (pharmMonthRes.data  ?? []) as SimpleRow[];
  const optMonth    = (opticalMonthRes.data ?? []) as SimpleRow[];
  const ipdMonth    = (ipdMonthRes.data    ?? []) as SimpleRow[];

  const monthLabBilled    = labMonth.reduce((s, r) => s + ((r.total as number) ?? 0), 0);
  const monthLabCollected = labMonth.reduce((s, r) => s + ((r.amountPaid as number) ?? 0), 0);
  const monthPharmBilled  = pharmMonth.reduce((s, r) => s + ((r.billAmount as number) ?? 0), 0);
  const monthPharmPaid    = pharmMonth.reduce((s, r) => s + ((r.paidAmount as number) ?? 0), 0);
  const monthOptBilled    = optMonth.reduce((s, r) => s + ((r.netAmount as number) ?? 0), 0);
  const monthOptPaid      = optMonth.reduce((s, r) => s + ((r.paidAmount as number) ?? 0), 0);
  const ipdAdmissions     = ipdMonth.length;
  const ipdOps            = ipdMonth.filter((r) => r.operationName).length;
  const ipdRevenue        = ipdMonth.reduce((s, r) => s + ((r.netAmount as number) ?? 0), 0);
  const ipdCollected      = ipdMonth.reduce((s, r) => s + ((r.totalReceivedAmount as number) ?? 0), 0);
  const ipdBalance        = ipdMonth.reduce((s, r) => s + ((r.balanceAmount as number) ?? 0), 0);
  const avgPackage        = ipdAdmissions > 0 ? Math.round(ipdRevenue / ipdAdmissions) : 0;

  const monthTotalBilled    = monthRxBilled + monthLabBilled + monthPharmBilled + monthOptBilled + ipdRevenue;
  const monthTotalCollected = monthRxCollected + monthLabCollected + monthPharmPaid + monthOptPaid + ipdCollected;

  // Month patient count
  const monthPatients = monthPatientsRes.data?.length ?? 0;

  // Expenses
  type ExpRow = { amount: number; category?: { name?: string } | null };
  const expenses = (expenseMonthRes.data ?? []) as ExpRow[];
  const expCatMap = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.category?.name ?? 'Other';
    expCatMap.set(cat, (expCatMap.get(cat) ?? 0) + (e.amount ?? 0));
  }
  const totalExpenses = Array.from(expCatMap.values()).reduce((s, v) => s + v, 0);

  // Dues (all-time unpaid)
  const opdDue    = (opdDuesRes.data  ?? []).reduce((s, r: SimpleRow) => s + ((r.balanceDue    as number) ?? 0), 0);
  const ipdDue    = (ipdDuesRes.data  ?? []).reduce((s, r: SimpleRow) => s + ((r.balanceAmount as number) ?? 0), 0);
  const labDue    = (labDuesRes.data  ?? []).reduce((s, r: SimpleRow) => s + ((r.balanceDue    as number) ?? 0), 0);
  const optDue    = (optDuesRes.data  ?? []).reduce((s, r: SimpleRow) => s + ((r.balanceDue    as number) ?? 0), 0);
  const pharmDue  = (pharmDuesRes.data ?? []).reduce((s, r: SimpleRow) => s + Math.max(0, ((r.billAmount as number) ?? 0) - ((r.paidAmount as number) ?? 0)), 0);
  const totalDue  = opdDue + ipdDue + labDue + optDue + pharmDue;

  // Payment modes
  type PayRow = { paymentMode: string | null; amount: number };
  const modeMap = new Map<string, number>();
  for (const p of (paymentModesRes.data ?? []) as PayRow[]) {
    if (!p.amount) continue;
    const mode = (p.paymentMode ?? 'Other').trim() || 'Other';
    modeMap.set(mode, (modeMap.get(mode) ?? 0) + p.amount);
  }
  const totalModeAmt = Array.from(modeMap.values()).reduce((s, a) => s + a, 0);

  // Top services
  type ItemRow = { description: string | null; amount: number };
  const svcMap = new Map<string, { revenue: number; count: number }>();
  for (const i of (invoiceItemMonthRes.data ?? []) as ItemRow[]) {
    if (!i.description) continue;
    const key = i.description.trim();
    if (!key) continue;
    const cur = svcMap.get(key) ?? { revenue: 0, count: 0 };
    svcMap.set(key, { revenue: cur.revenue + (i.amount ?? 0), count: cur.count + 1 });
  }
  const topServices = Array.from(svcMap.entries())
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  // Doctor performance (from Prescription)
  type DoctorRxRow = { doctorName: string | null; total: number };
  const doctorMap = new Map<string, { patients: number; revenue: number }>();
  for (const r of rxMonth as DoctorRxRow[]) {
    if (!r.doctorName) continue;
    const name = r.doctorName.trim();
    if (!name) continue;
    const cur = doctorMap.get(name) ?? { patients: 0, revenue: 0 };
    doctorMap.set(name, { patients: cur.patients + 1, revenue: cur.revenue + (r.total ?? 0) });
  }
  const doctorPerf = Array.from(doctorMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Gender distribution
  type GenderRow = { gender: string | null };
  let maleCnt = 0, femaleCnt = 0, otherCnt = 0;
  for (const r of (genderRes.data ?? []) as GenderRow[]) {
    const g = (r.gender ?? '').toUpperCase();
    if (g === 'MALE' || g === 'M') maleCnt++;
    else if (g === 'FEMALE' || g === 'F') femaleCnt++;
    else otherCnt++;
  }
  const genderTotal = maleCnt + femaleCnt + otherCnt;

  // Age groups (from patient age or dateOfBirth)
  type AgeRow = { age: number | null; dateOfBirth: string | null };
  const ageBuckets: Record<string, number> = {
    '0-17': 0, '18-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '75+': 0,
  };
  for (const r of (ageRes.data ?? []) as AgeRow[]) {
    let a = r.age;
    if (a == null && r.dateOfBirth) {
      a = Math.floor((Date.now() - new Date(r.dateOfBirth).getTime()) / (365.25 * 86_400_000));
    }
    if (a == null) continue;
    if      (a < 18) ageBuckets['0-17']++;
    else if (a < 31) ageBuckets['18-30']++;
    else if (a < 46) ageBuckets['31-45']++;
    else if (a < 61) ageBuckets['46-60']++;
    else if (a < 76) ageBuckets['61-75']++;
    else             ageBuckets['75+']++;
  }
  const topAges = Object.entries(ageBuckets)
    .sort((a, b) => b[1] - a[1])
    .filter(([, cnt]) => cnt > 0);

  // Status distribution
  type StatusRow = { status: string | null };
  const statusMap = new Map<string, number>();
  for (const r of (statusRes.data ?? []) as StatusRow[]) {
    const s = (r.status ?? 'UNKNOWN').toUpperCase();
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const statusDist = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const totalPts = statusDist.reduce((s, d) => s + d.count, 0);

  // Referrals
  type RefRow = { referredBy: string | null };
  const refMap = new Map<string, number>();
  for (const r of (referralRes.data ?? []) as RefRow[]) {
    const name = (r.referredBy ?? '').trim();
    if (!name) continue;
    refMap.set(name, (refMap.get(name) ?? 0) + 1);
  }
  const referrals = Array.from(refMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 7-day time series
  type WeekRxRow  = { prescriptionDate: string; total: number; amountPaid: number };
  type WeekExpRow = { date: string; amount: number };
  const dayMap = new Map<string, { patients: number; revenue: number; collected: number; expenses: number }>();
  for (const r of (weekRxRes.data ?? []) as WeekRxRow[]) {
    const d = isoDate(r.prescriptionDate);
    const cur = dayMap.get(d) ?? { patients: 0, revenue: 0, collected: 0, expenses: 0 };
    dayMap.set(d, {
      patients:  cur.patients + 1,
      revenue:   cur.revenue  + (r.total ?? 0),
      collected: cur.collected + (r.amountPaid ?? 0),
      expenses:  cur.expenses,
    });
  }
  for (const e of (weekExpRes.data ?? []) as WeekExpRow[]) {
    const d = isoDate(e.date);
    const cur = dayMap.get(d) ?? { patients: 0, revenue: 0, collected: 0, expenses: 0 };
    dayMap.set(d, { ...cur, expenses: cur.expenses + (e.amount ?? 0) });
  }
  const weekSeries = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Build brief ────────────────────────────────────────────────────────────
  const lines: string[] = [];

  lines.push('=== HOSPITAL ANALYTICS BRIEF ===');
  lines.push(`Date: ${now.toISOString().slice(0, 10)}   Period context: last 30 days (${monthName})`);

  // TODAY
  lines.push('');
  lines.push('=== TODAY ===');
  lines.push(`Patients with appointment: ${todayPatientCount}`);
  lines.push(`Revenue billed (OPD): ₹${fmtMoney(todayBilled)}  |  Collected: ₹${fmtMoney(todayCollected)}`);

  // THIS MONTH (last 30 days)
  {
    const collRate = monthTotalBilled > 0
      ? ((monthTotalCollected / monthTotalBilled) * 100).toFixed(1)
      : '0';
    const netFlow  = monthTotalCollected - totalExpenses;
    lines.push('');
    lines.push(`=== THIS MONTH (${monthName}) ===`);
    lines.push(`Total patients (new registrations): ${monthPatients}`);
    lines.push(`Revenue billed:  ₹${fmtMoney(monthTotalBilled)}`);
    lines.push(`Collected:       ₹${fmtMoney(monthTotalCollected)}  (collection rate: ${collRate}%)`);
    lines.push(`Discount given:  ₹${fmtMoney(monthRxDiscount)}`);
    lines.push(`Expenses:        ₹${fmtMoney(totalExpenses)}`);
    lines.push(`Net cash flow:   ₹${fmtMoney(netFlow)}  (${netFlow >= 0 ? 'SURPLUS' : 'DEFICIT'})`);
    lines.push('');
    lines.push('Revenue breakdown by category:');
    if (monthRxBilled    > 0) lines.push(`  Consultations (OPD): ₹${fmtMoney(monthRxBilled)} (${pct(monthRxBilled, monthTotalBilled)})`);
    if (monthLabBilled   > 0) lines.push(`  Labs:          ₹${fmtMoney(monthLabBilled)} (${pct(monthLabBilled, monthTotalBilled)})`);
    if (monthPharmBilled > 0) lines.push(`  Pharmacy:      ₹${fmtMoney(monthPharmBilled)} (${pct(monthPharmBilled, monthTotalBilled)})`);
    if (monthOptBilled   > 0) lines.push(`  Optical:       ₹${fmtMoney(monthOptBilled)} (${pct(monthOptBilled, monthTotalBilled)})`);
    if (ipdRevenue       > 0) lines.push(`  In-Patient:    ₹${fmtMoney(ipdRevenue)} (${pct(ipdRevenue, monthTotalBilled)})`);
  }

  // OUTSTANDING DUES
  lines.push('');
  lines.push('=== OUTSTANDING DUES (all-time, unpaid) ===');
  if (totalDue <= 0) {
    lines.push('No outstanding dues across any module.');
  } else {
    if (opdDue   > 0) lines.push(`  OPD (consultations): ₹${fmtMoney(opdDue)}`);
    if (ipdDue   > 0) lines.push(`  IPD (inpatients):    ₹${fmtMoney(ipdDue)}`);
    if (labDue   > 0) lines.push(`  Lab:                 ₹${fmtMoney(labDue)}`);
    if (optDue   > 0) lines.push(`  Optical:             ₹${fmtMoney(optDue)}`);
    if (pharmDue > 0) lines.push(`  Pharmacy:            ₹${fmtMoney(pharmDue)}`);
    lines.push(`  TOTAL OUTSTANDING:   ₹${fmtMoney(totalDue)}`);
  }

  // PAYMENT MODE BREAKDOWN
  if (modeMap.size > 0) {
    lines.push('');
    lines.push('=== PAYMENT MODE BREAKDOWN (this month, OPD collections) ===');
    const sorted = Array.from(modeMap.entries()).sort((a, b) => b[1] - a[1]);
    for (const [mode, amount] of sorted) {
      lines.push(`  ${mode}: ₹${fmtMoney(amount)} (${pct(amount, totalModeAmt)})`);
    }
  }

  // IPD
  if (ipdAdmissions > 0) {
    const ipdRate = ipdRevenue > 0 ? ((ipdCollected / ipdRevenue) * 100).toFixed(1) : '0';
    lines.push('');
    lines.push('=== IN-PATIENT (IPD) THIS MONTH ===');
    lines.push(`Admissions: ${ipdAdmissions}`);
    lines.push(`Operations/surgeries: ${ipdOps}`);
    lines.push(`Average package: ₹${fmtMoney(avgPackage)}`);
    lines.push(`Revenue billed: ₹${fmtMoney(ipdRevenue)}  |  Collected: ₹${fmtMoney(ipdCollected)}  |  Outstanding: ₹${fmtMoney(ipdBalance)}`);
    lines.push(`IPD collection rate: ${ipdRate}%`);
  }

  // LAST 7 DAYS TREND
  if (weekSeries.length > 0) {
    lines.push('');
    lines.push('=== LAST 7 DAYS TREND ===');
    for (const day of weekSeries) {
      const net = day.collected - day.expenses;
      lines.push(
        `  ${day.date}: ${day.patients} patients · billed ₹${fmtMoney(day.revenue)} · ` +
        `collected ₹${fmtMoney(day.collected)} · expenses ₹${fmtMoney(day.expenses)} · net ₹${fmtMoney(net)}`,
      );
    }
  }

  // TOP SERVICES
  if (topServices.length > 0) {
    lines.push('');
    lines.push('=== TOP SERVICES THIS MONTH (by revenue) ===');
    for (let i = 0; i < topServices.length; i++) {
      const s = topServices[i];
      const avgPerSvc = s.count > 0 ? Math.round(s.revenue / s.count) : 0;
      lines.push(`  ${i + 1}. ${s.name}: ₹${fmtMoney(s.revenue)} (${s.count}× · avg ₹${fmtMoney(avgPerSvc)})`);
    }
  }

  // DOCTOR PERFORMANCE
  if (doctorPerf.length > 0) {
    lines.push('');
    lines.push('=== DOCTOR PERFORMANCE THIS MONTH ===');
    for (let i = 0; i < doctorPerf.length; i++) {
      const d = doctorPerf[i];
      const revPerPt = d.patients > 0 ? Math.round(d.revenue / d.patients) : 0;
      lines.push(`  ${i + 1}. ${d.name}: ${d.patients} patients · ₹${fmtMoney(d.revenue)} revenue · ₹${fmtMoney(revPerPt)}/patient`);
    }
  }

  // EXPENSE BREAKDOWN
  if (expCatMap.size > 0) {
    lines.push('');
    lines.push(`=== EXPENSE BREAKDOWN THIS MONTH (total ₹${fmtMoney(totalExpenses)}) ===`);
    const sorted = Array.from(expCatMap.entries()).sort((a, b) => b[1] - a[1]);
    for (const [cat, amt] of sorted) {
      lines.push(`  ${cat}: ₹${fmtMoney(amt)} (${pct(amt, totalExpenses)})`);
    }
  }

  // DEMOGRAPHICS
  lines.push('');
  lines.push('=== PATIENT DEMOGRAPHICS (this month) ===');
  if (genderTotal > 0) {
    lines.push(
      `Gender: Male ${maleCnt} (${pct(maleCnt, genderTotal)}), Female ${femaleCnt} (${pct(femaleCnt, genderTotal)}), Other ${otherCnt}`,
    );
  }
  if (topAges.length > 0) {
    lines.push(`Age groups (most to least): ${topAges.slice(0, 6).map(([label, cnt]) => `${label} (${cnt})`).join(', ')}`);
  }

  // STATUS DISTRIBUTION
  if (statusDist.length > 0) {
    lines.push('');
    lines.push('=== PATIENT STATUS DISTRIBUTION ===');
    for (const s of statusDist) {
      lines.push(`  ${s.status}: ${s.count} (${pct(s.count, totalPts)})`);
    }
  }

  // TOP REFERRAL SOURCES
  if (referrals.length > 0) {
    lines.push('');
    lines.push('=== TOP REFERRAL SOURCES ===');
    for (const r of referrals) {
      lines.push(`  ${r.name}: ${r.count} patients`);
    }
  }

  return lines.join('\n');
}

// ── Context resolver ──────────────────────────────────────────────────────────

/**
 * Resolve the appropriate context brief given the input.
 * For patient mode: uses patientId if provided, otherwise extracts a token
 * from the question + history and tries to fuzzy-match a patient.
 */
export async function resolvePatientContext(
  supabase: SupabaseClient,
  hospitalId: string,
  input: AiInput,
): Promise<string> {
  // Caller locked in a specific patient — use it directly.
  if (input.patientId) {
    return buildPatientContext(supabase, hospitalId, input.patientId);
  }

  // Generic mode: scan question + recent user turns for an identifier.
  const userTexts = [
    input.question,
    ...(input.history ?? []).filter((m) => m.role === 'user').map((m) => m.text).reverse(),
  ];
  const token = extractPatientToken(userTexts.join('\n'));
  if (!token) {
    return (
      '(NO PATIENT)\n' +
      'No patient identifier was provided. Ask the user to share a patient UID (e.g. P-0005) ' +
      'or 10-digit phone number, then they can re-send the question.'
    );
  }

  const resolved = await findPatientByToken(supabase, hospitalId, token);
  if (!resolved) {
    return (
      `(NOT FOUND)\nNo patient record matched "${token}". ` +
      'Ask the user to double-check the UID or phone and try again.'
    );
  }

  return buildPatientContext(supabase, hospitalId, resolved);
}

// Re-export MAX_HISTORY_TURNS so service.ts can use it.
export { MAX_HISTORY_TURNS };
