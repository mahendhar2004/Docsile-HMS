/**
 * Data-access layer for the license-tracker module.
 *
 * Tables owned:
 *   - License  — hospital license records, ordered by expiryDate ASC
 *
 * Document handling:
 *   saveDocumentUrl: persists a URL string to License.documentUrl after the client
 *     uploads the file to the "license-documents" Supabase Storage bucket.
 *   clearDocumentUrl: derives the bucket-relative file path from the CURRENT
 *     documentUrl (same "/object/public/license-documents/" marker parsing the old
 *     Next.js frontend's src/lib/storage.ts getFilePathFromUrl() used), deletes that
 *     object from Storage, then clears the DB field. This matches the old
 *     removeLicenseDocument(licenseId, filePath) behavior WITHOUT requiring the
 *     client to know or send the storage path — the server already has the URL on
 *     the row it just fetched. Fixed after being caught as a regression: the
 *     scaffolded openapi.yaml contract for DELETE /license-tracker/{id}/document
 *     never carried a filePath, and the old code deleted from Storage before
 *     clearing the DB field — an implementation that only cleared the DB field
 *     would silently leak orphaned files into the bucket forever.
 *
 * Every query is scoped to hospitalId per ADR-007. The service_role key bypasses RLS,
 * so this WHERE clause is the sole tenant-isolation enforcement for Edge Function queries.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError, ServiceUnavailableError } from '../_shared/errors.ts';
import { withTimestamps } from '../_shared/db-helpers.ts';
import type { License } from './types.ts';

const STORAGE_BUCKET = 'license-documents';

/**
 * Derive the bucket-relative file path from a Supabase Storage public URL.
 * Mirrors src/lib/storage.ts's getFilePathFromUrl() exactly (same marker,
 * same bucket name) so behavior matches the old frontend/backend pairing.
 * Returns null if the URL doesn't match the expected public-URL shape —
 * callers should skip Storage deletion in that case rather than error,
 * since there's nothing derivable to delete.
 */
function getFilePathFromUrl(documentUrl: string): string | null {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = documentUrl.indexOf(marker);
  if (idx === -1) return null;
  return documentUrl.slice(idx + marker.length);
}

export class LicenseTrackerRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly hospitalId: string,
  ) {}

  /** Return all licenses for this hospital, soonest-expiring first. */
  async findAll(): Promise<License[]> {
    const { data, error } = await this.supabase
      .from('License')
      .select('*')
      .eq('hospital_id', this.hospitalId)
      .order('expiryDate', { ascending: true });

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return (data ?? []) as License[];
  }

  /**
   * Find a single license by id, scoped to this hospital.
   * Returns null when not found (caller decides whether that is an error).
   */
  async findById(id: string): Promise<License | null> {
    const { data, error } = await this.supabase
      .from('License')
      .select('*')
      .eq('id', id)
      .eq('hospital_id', this.hospitalId)
      .maybeSingle();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as License | null;
  }

  /** Insert a new license row and return the created record. */
  async insert(
    payload: Omit<License, 'id'> & { createdBy: string },
  ): Promise<License> {
    const { data, error } = await this.supabase
      .from('License')
      .insert(withTimestamps({ ...payload, hospital_id: this.hospitalId }))
      .select()
      .single();

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
    return data as License;
  }

  /**
   * Apply a partial update to the license with the given id.
   * The updatedAt trigger on the License table handles the timestamp automatically.
   */
  async update(id: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('License')
      .update(patch)
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /** Hard-delete a license row (no soft-delete on this entity). */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('License')
      .delete()
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /**
   * Persist the document URL (plain string) on the license record.
   * Called after the client has uploaded the file to Supabase Storage.
   */
  async saveDocumentUrl(id: string, url: string): Promise<void> {
    const { error } = await this.supabase
      .from('License')
      .update({ documentUrl: url })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }

  /**
   * Delete the Storage object referenced by `documentUrl` (if a bucket-relative
   * path can be derived from it), then clear the documentUrl field to null.
   *
   * Matches the old removeLicenseDocument's fail-closed behavior: if a path WAS
   * derivable but the Storage delete fails, the DB field is NOT cleared (throws) —
   * the license keeps pointing at a document until deletion actually succeeds,
   * so this method is safe to retry. If no path could be derived (documentUrl
   * doesn't match the expected Storage public-URL shape), there's nothing to
   * delete, so the DB field is still cleared — that's not a Storage-cleanup bug,
   * it's a stale/malformed URL that was never a real Storage cleanup case.
   */
  async clearDocumentUrl(id: string, currentDocumentUrl: string | null | undefined): Promise<void> {
    if (currentDocumentUrl) {
      const filePath = getFilePathFromUrl(currentDocumentUrl);
      if (filePath) {
        const { error: storageError } = await this.supabase.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);
        if (storageError) {
          throw new ServiceUnavailableError('Supabase Storage', storageError.message);
        }
      }
    }

    const { error } = await this.supabase
      .from('License')
      .update({ documentUrl: null })
      .eq('id', id)
      .eq('hospital_id', this.hospitalId);

    if (error) throw new ServiceUnavailableError('Supabase', error.message);
  }
}
