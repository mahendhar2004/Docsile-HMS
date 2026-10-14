/**
 * Settings service — business layer.
 *
 * Covers all 33 settings endpoints:
 *   ServiceTemplate  (4): list, create, update, delete (hard)
 *   HospitalProfile  (2): get, update (upsert)
 *   PrintConfig      (2): get, save (stored inside HospitalProfile.settings JSON)
 *   NavStyle         (1): update (stored inside HospitalProfile.settings JSON)
 *   PredefinedTemplate (prescription, 4): list, create, update, delete (hard)
 *   InpatientTemplate  (4): list, create, update, delete (hard)
 *   PredefinedPackage  (4): list, create, update, delete (hard)
 *   PredefinedSurgery  (4): list, create, update, delete (soft — isActive=false)
 *   PredefinedDischarge(4): list, create, update, delete (soft — isActive=false)
 *   MedicineMaster     (4): list, create, update, delete (hard)
 *   Doctor             (4): list, create, update, delete (hard)
 *
 * Layer rules:
 * - No DB calls here: all data access delegated to SettingsRepository.
 * - No HTTP/transport objects: no Request, Response, or Hono Context.
 * - Throws typed AppError subclasses on business rule violations so that
 *   index.ts's handleError converts them to the correct HTTP status.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { SettingsRepository } from './repository.ts';
import { NotFoundError, ConflictError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type {
  ServiceTemplateInput,
  HospitalProfileInput,
  PredefinedTemplateInput,
  InpatientTemplateInput,
  PredefinedPackageInput,
  PredefinedSurgeryInput,
  PredefinedDischargeInput,
  MedicineMasterInput,
  DoctorInput,
} from './types.ts';

/** Factory: create a SettingsRepository scoped to the caller's hospital. */
function repo(session: Session): SettingsRepository {
  return new SettingsRepository(getSupabaseClient(), session.hospitalId);
}

// ─── ServiceTemplate ─────────────────────────────────────────────────────────

export async function listServiceTemplates(session: Session, includeInactive = false) {
  return repo(session).listServiceTemplates(includeInactive);
}

export async function createServiceTemplate(session: Session, body: ServiceTemplateInput) {
  const now = new Date().toISOString();
  return repo(session).insertServiceTemplate({
    name: body.name,
    category: body.category ?? null,
    description: body.description ?? null,
    amount: body.amount,
    discount: body.discount ?? 0,
    sortOrder: body.sortOrder ?? 0,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateServiceTemplate(
  session: Session,
  id: string,
  body: Partial<ServiceTemplateInput>,
) {
  const r = repo(session);
  const existing = await r.findServiceTemplateById(id);
  if (!existing) throw new NotFoundError('ServiceTemplate', id);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.category !== undefined) patch.category = body.category;
  if (body.description !== undefined) patch.description = body.description;
  if (body.amount !== undefined) patch.amount = body.amount;
  if (body.discount !== undefined) patch.discount = body.discount;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await r.updateServiceTemplate(id, patch);
}

export async function deleteServiceTemplate(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findServiceTemplateById(id);
  if (!existing) throw new NotFoundError('ServiceTemplate', id);
  await r.deleteServiceTemplate(id);
}

// ─── HospitalProfile ─────────────────────────────────────────────────────────

export async function getHospitalProfile(session: Session) {
  const profile = await repo(session).getHospitalProfile();
  if (!profile) throw new NotFoundError('HospitalProfile', session.hospitalId);
  return profile;
}

export async function updateHospitalProfile(
  session: Session,
  body: Partial<HospitalProfileInput>,
) {
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.displayName !== undefined) patch.displayName = body.displayName;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email;
  if (body.website !== undefined) patch.website = body.website;
  if (body.registrationNo !== undefined) patch.registrationNo = body.registrationNo;
  if (body.gstin !== undefined) patch.gstin = body.gstin;
  if (body.registrationFeeEnabled !== undefined) patch.registrationFeeEnabled = body.registrationFeeEnabled;
  if (body.registrationFeeAmount !== undefined) patch.registrationFeeAmount = body.registrationFeeAmount;
  if (body.registrationFeeDefaultChecked !== undefined) patch.registrationFeeDefaultChecked = body.registrationFeeDefaultChecked;
  if (body.tone !== undefined) patch.tone = body.tone;
  if (body.departments !== undefined) patch.departments = body.departments;
  if (body.settings !== undefined) patch.settings = body.settings;
  await repo(session).upsertHospitalProfile(patch);
}

// ─── PrintConfig ─────────────────────────────────────────────────────────────
// Print config is stored as a key-value blob inside HospitalProfile.settings (TEXT/JSON).
// GET returns the parsed settings object; PATCH merges the incoming body into it.

export async function getPrintConfig(session: Session): Promise<Record<string, unknown>> {
  const profile = await repo(session).getHospitalProfile();
  if (!profile?.settings) return {};
  try {
    const parsed = typeof profile.settings === 'string'
      ? JSON.parse(profile.settings)
      : profile.settings;
    return (parsed as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

export async function savePrintConfig(session: Session, body: Record<string, unknown>) {
  const r = repo(session);
  const profile = await r.getHospitalProfile();
  let base: Record<string, unknown> = {};
  if (profile?.settings) {
    try {
      base = typeof profile.settings === 'string'
        ? JSON.parse(profile.settings)
        : (profile.settings as Record<string, unknown>) ?? {};
    } catch { /* start fresh if settings JSON is corrupt */ }
  }
  const merged = { ...base, ...body };
  await r.upsertHospitalProfile({ settings: JSON.stringify(merged) });
}

// ─── NavStyle ─────────────────────────────────────────────────────────────────
// navStyle is stored as a key inside HospitalProfile.settings JSON.

export async function updateNavStyle(session: Session, navStyle: string) {
  const r = repo(session);
  const profile = await r.getHospitalProfile();
  let base: Record<string, unknown> = {};
  if (profile?.settings) {
    try {
      base = typeof profile.settings === 'string'
        ? JSON.parse(profile.settings)
        : (profile.settings as Record<string, unknown>) ?? {};
    } catch { /* start fresh */ }
  }
  base.navStyle = navStyle;
  await r.upsertHospitalProfile({ settings: JSON.stringify(base) });
}

// ─── PredefinedTemplate (prescription templates) ──────────────────────────────

export async function listPrescriptionTemplates(session: Session, includeInactive = false) {
  return repo(session).listPrescriptionTemplates(includeInactive);
}

export async function createPrescriptionTemplate(session: Session, body: PredefinedTemplateInput) {
  const r = repo(session);
  const code = body.code.trim().toUpperCase();
  const existing = await r.findPrescriptionTemplateByCode(code);
  if (existing) {
    throw new ConflictError(
      `PredefinedTemplate with code "${code}" already exists. Choose a different code.`,
    );
  }
  const now = new Date().toISOString();
  return r.insertPrescriptionTemplate({
    code,
    name: body.name.trim(),
    presentComplaint: body.presentComplaint?.trim() || null,
    previousHistory: body.previousHistory?.trim() || null,
    provisionalDiagnosis: body.provisionalDiagnosis?.trim() || null,
    medicines: body.medicines ?? '[]',
    investigations: body.investigations ?? '[]',
    followUpDays: body.followUpDays ?? null,
    additionalNotes: body.additionalNotes?.trim() || null,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePrescriptionTemplate(
  session: Session,
  id: string,
  body: Partial<PredefinedTemplateInput>,
) {
  const r = repo(session);
  const existing = await r.findPrescriptionTemplateById(id);
  if (!existing) throw new NotFoundError('PredefinedTemplate', id);

  const patch: Record<string, unknown> = {};
  if (body.code !== undefined) patch.code = body.code.trim().toUpperCase();
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.presentComplaint !== undefined) patch.presentComplaint = body.presentComplaint?.trim() || null;
  if (body.previousHistory !== undefined) patch.previousHistory = body.previousHistory?.trim() || null;
  if (body.provisionalDiagnosis !== undefined) patch.provisionalDiagnosis = body.provisionalDiagnosis?.trim() || null;
  if (body.medicines !== undefined) patch.medicines = body.medicines;
  if (body.investigations !== undefined) patch.investigations = body.investigations;
  if (body.followUpDays !== undefined) patch.followUpDays = body.followUpDays;
  if (body.additionalNotes !== undefined) patch.additionalNotes = body.additionalNotes?.trim() || null;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await r.updatePrescriptionTemplate(id, patch);
}

export async function deletePrescriptionTemplate(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findPrescriptionTemplateById(id);
  if (!existing) throw new NotFoundError('PredefinedTemplate', id);
  await r.deletePrescriptionTemplate(id);
}

// ─── InpatientTemplate ────────────────────────────────────────────────────────

export async function listInpatientTemplates(session: Session, includeInactive = false) {
  return repo(session).listInpatientTemplates(includeInactive);
}

export async function createInpatientTemplate(session: Session, body: InpatientTemplateInput) {
  const r = repo(session);
  const code = body.code.trim().toUpperCase();
  const existing = await r.findInpatientTemplateByCode(code);
  if (existing) {
    throw new ConflictError(
      `InpatientTemplate with code "${code}" already exists. Choose a different code.`,
    );
  }
  const now = new Date().toISOString();
  return r.insertInpatientTemplate({
    code,
    name: body.name.trim(),
    operationName: body.operationName?.trim() || null,
    provisionDiagnosis: body.provisionDiagnosis?.trim() || null,
    medicines: body.medicines ?? '[]',
    followUpDays: body.followUpDays ?? null,
    additionalNotes: body.additionalNotes?.trim() || null,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateInpatientTemplate(
  session: Session,
  id: string,
  body: Partial<InpatientTemplateInput>,
) {
  const r = repo(session);
  const existing = await r.findInpatientTemplateById(id);
  if (!existing) throw new NotFoundError('InpatientTemplate', id);

  const patch: Record<string, unknown> = {};
  if (body.code !== undefined) patch.code = body.code.trim().toUpperCase();
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.operationName !== undefined) patch.operationName = body.operationName?.trim() || null;
  if (body.provisionDiagnosis !== undefined) patch.provisionDiagnosis = body.provisionDiagnosis?.trim() || null;
  if (body.medicines !== undefined) patch.medicines = body.medicines;
  if (body.followUpDays !== undefined) patch.followUpDays = body.followUpDays;
  if (body.additionalNotes !== undefined) patch.additionalNotes = body.additionalNotes?.trim() || null;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await r.updateInpatientTemplate(id, patch);
}

export async function deleteInpatientTemplate(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findInpatientTemplateById(id);
  if (!existing) throw new NotFoundError('InpatientTemplate', id);
  await r.deleteInpatientTemplate(id);
}

// ─── PredefinedPackage ────────────────────────────────────────────────────────

export async function listPackages(session: Session, includeInactive = false) {
  return repo(session).listPackages(includeInactive);
}

export async function createPackage(session: Session, body: PredefinedPackageInput) {
  const r = repo(session);
  const nameTrimmed = body.name.trim();
  const existing = await r.findPackageByName(nameTrimmed);
  if (existing) {
    throw new ConflictError(
      `PredefinedPackage with name "${nameTrimmed}" already exists.`,
    );
  }
  const now = new Date().toISOString();
  return r.insertPackage({
    name: nameTrimmed,
    inclusions: body.inclusions ?? '[]',
    totalAmount: body.totalAmount,
    discount: body.discount ?? 0,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePackage(
  session: Session,
  id: string,
  body: Partial<PredefinedPackageInput>,
) {
  const r = repo(session);
  const existing = await r.findPackageById(id);
  if (!existing) throw new NotFoundError('PredefinedPackage', id);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.inclusions !== undefined) patch.inclusions = body.inclusions;
  if (body.totalAmount !== undefined) patch.totalAmount = body.totalAmount;
  if (body.discount !== undefined) patch.discount = body.discount;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await r.updatePackage(id, patch);
}

export async function deletePackage(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findPackageById(id);
  if (!existing) throw new NotFoundError('PredefinedPackage', id);
  await r.deletePackage(id);
}

// ─── PredefinedSurgery (soft delete) ─────────────────────────────────────────

export async function listSurgeries(session: Session, includeInactive = false) {
  return repo(session).listSurgeries(includeInactive);
}

export async function createSurgery(session: Session, body: PredefinedSurgeryInput) {
  const now = new Date().toISOString();
  return repo(session).insertSurgery({
    name: body.name.trim(),
    department: body.department ?? null,
    doctorNames: JSON.stringify(body.doctorNames ?? []),
    onDutyDoctors: JSON.stringify(body.onDutyDoctors ?? []),
    provisionDiagnosis: body.provisionDiagnosis ?? null,
    operationProcedure: body.operationProcedure ?? null,
    operationDetails: body.operationDetails ?? null,
    isActive: true,
    sortOrder: body.sortOrder ?? 0,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateSurgery(
  session: Session,
  id: string,
  body: Partial<PredefinedSurgeryInput>,
) {
  const r = repo(session);
  const existing = await r.findSurgeryById(id);
  if (!existing) throw new NotFoundError('PredefinedSurgery', id);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.department !== undefined) patch.department = body.department;
  if (body.doctorNames !== undefined) patch.doctorNames = JSON.stringify(body.doctorNames);
  if (body.onDutyDoctors !== undefined) patch.onDutyDoctors = JSON.stringify(body.onDutyDoctors);
  if (body.provisionDiagnosis !== undefined) patch.provisionDiagnosis = body.provisionDiagnosis;
  if (body.operationProcedure !== undefined) patch.operationProcedure = body.operationProcedure;
  if (body.operationDetails !== undefined) patch.operationDetails = body.operationDetails;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
  await r.updateSurgery(id, patch);
}

export async function deleteSurgery(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findSurgeryById(id);
  if (!existing) throw new NotFoundError('PredefinedSurgery', id);
  await r.softDeleteSurgery(id);
}

// ─── PredefinedDischarge (soft delete) ───────────────────────────────────────

export async function listDischarges(session: Session, includeInactive = false) {
  return repo(session).listDischarges(includeInactive);
}

export async function createDischarge(session: Session, body: PredefinedDischargeInput) {
  const now = new Date().toISOString();
  return repo(session).insertDischarge({
    name: body.name.trim(),
    dischargeDiagnosis: body.dischargeDiagnosis ?? null,
    conditionAtDischarge: body.conditionAtDischarge ?? null,
    dischargeMedications: body.dischargeMedications ?? null,
    followUpInstructions: body.followUpInstructions ?? null,
    isActive: true,
    sortOrder: body.sortOrder ?? 0,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateDischarge(
  session: Session,
  id: string,
  body: Partial<PredefinedDischargeInput>,
) {
  const r = repo(session);
  const existing = await r.findDischargeById(id);
  if (!existing) throw new NotFoundError('PredefinedDischarge', id);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.dischargeDiagnosis !== undefined) patch.dischargeDiagnosis = body.dischargeDiagnosis;
  if (body.conditionAtDischarge !== undefined) patch.conditionAtDischarge = body.conditionAtDischarge;
  if (body.dischargeMedications !== undefined) patch.dischargeMedications = body.dischargeMedications;
  if (body.followUpInstructions !== undefined) patch.followUpInstructions = body.followUpInstructions;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
  await r.updateDischarge(id, patch);
}

export async function deleteDischarge(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findDischargeById(id);
  if (!existing) throw new NotFoundError('PredefinedDischarge', id);
  await r.softDeleteDischarge(id);
}

// ─── MedicineMaster ───────────────────────────────────────────────────────────

export async function listMedicineMaster(session: Session, includeInactive = false) {
  return repo(session).listMedicineMaster(includeInactive);
}

export async function createMedicineMaster(session: Session, body: MedicineMasterInput) {
  const r = repo(session);
  const nameTrimmed = body.name.trim();
  const existing = await r.findMedicineMasterByName(nameTrimmed);
  if (existing) {
    throw new ConflictError(
      `MedicineMaster with name "${nameTrimmed}" already exists.`,
    );
  }
  const now = new Date().toISOString();
  return r.insertMedicineMaster({
    name: nameTrimmed,
    category: body.category?.trim() || null,
    defaultTiming: body.defaultTiming?.trim() || null,
    defaultDays: body.defaultDays?.trim() || null,
    note: body.note?.trim() || null,
    sortOrder: body.sortOrder ?? 0,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateMedicineMaster(
  session: Session,
  id: string,
  body: Partial<MedicineMasterInput>,
) {
  const r = repo(session);
  const existing = await r.findMedicineMasterById(id);
  if (!existing) throw new NotFoundError('MedicineMaster', id);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.category !== undefined) patch.category = body.category?.trim() || null;
  if (body.defaultTiming !== undefined) patch.defaultTiming = body.defaultTiming?.trim() || null;
  if (body.defaultDays !== undefined) patch.defaultDays = body.defaultDays?.trim() || null;
  if (body.note !== undefined) patch.note = body.note?.trim() || null;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await r.updateMedicineMaster(id, patch);
}

export async function deleteMedicineMaster(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findMedicineMasterById(id);
  if (!existing) throw new NotFoundError('MedicineMaster', id);
  await r.deleteMedicineMaster(id);
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

export async function listDoctors(session: Session, includeInactive = false) {
  return repo(session).listDoctors(includeInactive);
}

export async function createDoctor(session: Session, body: DoctorInput) {
  const r = repo(session);
  const nameTrimmed = body.name.trim();
  const existing = await r.findDoctorByName(nameTrimmed);
  if (existing) {
    throw new ConflictError(`Doctor with name "${nameTrimmed}" already exists.`);
  }
  const now = new Date().toISOString();
  return r.insertDoctor({
    name: nameTrimmed,
    department: body.department?.trim() || null,
    specialization: body.specialization?.trim() || null,
    consultationFee: body.consultationFee ?? null,
    phone: body.phone?.trim() || null,
    sortOrder: body.sortOrder ?? 0,
    isActive: true,
    createdBy: session.id,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateDoctor(
  session: Session,
  id: string,
  body: Partial<DoctorInput>,
) {
  const r = repo(session);
  const existing = await r.findDoctorById(id);
  if (!existing) throw new NotFoundError('Doctor', id);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.department !== undefined) patch.department = body.department?.trim() || null;
  if (body.specialization !== undefined) patch.specialization = body.specialization?.trim() || null;
  if (body.consultationFee !== undefined) patch.consultationFee = body.consultationFee ?? null;
  if (body.phone !== undefined) patch.phone = body.phone?.trim() || null;
  if (body.sortOrder !== undefined) patch.sortOrder = body.sortOrder;
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  await r.updateDoctor(id, patch);
}

export async function deleteDoctor(session: Session, id: string) {
  const r = repo(session);
  const existing = await r.findDoctorById(id);
  if (!existing) throw new NotFoundError('Doctor', id);
  await r.deleteDoctor(id);
}
