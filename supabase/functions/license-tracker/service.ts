/**
 * Business layer for the license-tracker module.
 *
 * Rules:
 * - Every operation is scoped to s.hospitalId (ADR-007).
 * - Existence is verified before update/delete/document operations — errors carry the
 *   resource type + id so callers can produce descriptive messages (error-handling principles).
 * - No transport concerns (no Request/Response objects), no direct DB queries.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { NotFoundError, ValidationError } from '../_shared/errors.ts';
import type { Session } from '../_shared/auth.ts';
import type { License } from './types.ts';
import { LicenseTrackerRepository } from './repository.ts';

function makeRepo(s: Session): LicenseTrackerRepository {
  return new LicenseTrackerRepository(getSupabaseClient(), s.hospitalId);
}

/** Return all licenses for the hospital, ordered by expiryDate ascending. */
export async function listLicenses(s: Session): Promise<License[]> {
  return makeRepo(s).findAll();
}

/**
 * Create a new license record.
 * expiryDate is required (NOT NULL in DB) — a missing value is caught here before
 * reaching the database so the error message is descriptive rather than a raw DB error.
 */
export async function createLicense(s: Session, b: License): Promise<License> {
  if (!b.expiryDate) {
    throw new ValidationError('License expiryDate is required and must not be null.');
  }

  return makeRepo(s).insert({
    name: b.name,
    licenseNumber: b.licenseNumber ?? null,
    issuingBody: b.issuingBody ?? null,
    category: b.category ?? null,
    issueDate: b.issueDate ?? null,
    expiryDate: b.expiryDate,
    reminderDays: b.reminderDays ?? 30,
    status: b.status ?? 'ACTIVE',
    documentUrl: b.documentUrl ?? null,
    notes: b.notes ?? null,
    createdBy: s.id,
  });
}

/**
 * Apply a partial update to an existing license.
 * Verifies ownership (hospitalId-scoped findById) before writing.
 */
export async function updateLicense(
  s: Session,
  id: string,
  b: Partial<License>,
): Promise<void> {
  const r = makeRepo(s);
  const existing = await r.findById(id);
  if (!existing) throw new NotFoundError('License', id);

  // Build the patch from only the fields that are present in the request body.
  // Never pass `id` or `hospital_id` — those are immutable.
  const patch: Record<string, unknown> = {};
  if (b.name !== undefined) patch.name = b.name;
  if (b.licenseNumber !== undefined) patch.licenseNumber = b.licenseNumber;
  if (b.issuingBody !== undefined) patch.issuingBody = b.issuingBody;
  if (b.category !== undefined) patch.category = b.category;
  if (b.issueDate !== undefined) patch.issueDate = b.issueDate;
  if (b.expiryDate !== undefined) patch.expiryDate = b.expiryDate;
  if (b.reminderDays !== undefined) patch.reminderDays = b.reminderDays;
  if (b.status !== undefined) patch.status = b.status;
  if (b.notes !== undefined) patch.notes = b.notes;
  // documentUrl updates via PATCH /:id/document — omit here to keep concerns separate

  await r.update(id, patch);
}

/**
 * Hard-delete a license record.
 * Verifies ownership before deletion so the 404 is specific ("License with id X not found")
 * rather than a silent no-op.
 */
export async function deleteLicense(s: Session, id: string): Promise<void> {
  const r = makeRepo(s);
  const existing = await r.findById(id);
  if (!existing) throw new NotFoundError('License', id);
  await r.delete(id);
}

/**
 * Persist a document URL on a license record.
 * Called after the client has uploaded the file to the "license-documents" Supabase Storage
 * bucket and obtained its public/signed URL. This endpoint stores the URL only — it performs
 * no Storage interaction.
 */
export async function saveDocumentUrl(
  s: Session,
  id: string,
  url: string,
): Promise<void> {
  const r = makeRepo(s);
  const existing = await r.findById(id);
  if (!existing) throw new NotFoundError('License', id);
  await r.saveDocumentUrl(id, url);
}

/**
 * Delete the license's document from Supabase Storage (derived from its current
 * documentUrl) and clear the documentUrl field. Matches the old
 * removeLicenseDocument's Storage-then-DB order — see repository.ts's
 * clearDocumentUrl jsdoc for why this doesn't need the client to send a filePath.
 */
export async function removeDocument(s: Session, id: string): Promise<void> {
  const r = makeRepo(s);
  const existing = await r.findById(id);
  if (!existing) throw new NotFoundError('License', id);
  await r.clearDocumentUrl(id, existing.documentUrl);
}
