/**
 * Queue service — business layer.
 *
 * Responsibilities:
 *   1. Instantiate the repository with the service-role client and the caller's hospitalId.
 *   2. Delegate all data access to QueueRepository.
 *   3. Return typed results directly — no shape transformation needed (the repository
 *      already applies today's IST date filter and computes status in-process).
 *
 * No DB calls live here — all data access goes through QueueRepository.
 * No permission logic lives here — requirePermission('queue:view') is wired
 * structurally in index.ts per ADR-002/006.
 *
 * Date: the three endpoints always operate on today's IST calendar date. This is the
 * correct default for the initial/full-state fetch pattern (page load or Realtime
 * reconnect). The repository accepts an optional date override if a caller ever needs
 * a historical snapshot, but index.ts always calls without one.
 */

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { QueueRepository } from './repository.ts';
import type { Session } from '../_shared/auth.ts';
import type { OpdQueueEntry, WorkupQueueEntry, InpatientBoardEntry } from './types.ts';

/**
 * Returns today's OPD doctor queue for the authenticated hospital.
 *
 * Merges patients who have an appointment, a prescription, or an eye reading today
 * (three parallel queries), computes their queue status from data, and returns the
 * merged list. This is the initial full-state fetch; the client subscribes to
 * `hospital:{hospitalId}:queue` via Supabase Realtime for subsequent incremental updates.
 */
export async function getOpdQueue(session: Session): Promise<OpdQueueEntry[]> {
  const repo = new QueueRepository(getSupabaseClient(), session.hospitalId);
  return repo.getOpdQueue();
}

/**
 * Returns today's workup queue (patients awaiting pre-consultation eye workup).
 *
 * Same three-query merge logic as getOpdQueue but with a lighter prescription select
 * (no InvoiceItem or LabBill expansion — the workup screen does not need billing data).
 * Patient status is computed the same way; the workup screen uses it to determine which
 * patients still need the optometrist vs. those already seen by the doctor.
 */
export async function getWorkupQueue(session: Session): Promise<WorkupQueueEntry[]> {
  const repo = new QueueRepository(getSupabaseClient(), session.hospitalId);
  return repo.getWorkupQueue();
}

/**
 * Returns the bed/status board — all currently admitted inpatients (status != DISCHARGED).
 *
 * This is the initial full-state fetch for the inpatient board. The client subscribes to
 * `hospital:{hospitalId}:beds` via Supabase Realtime (enabled by migration
 * 20260922010000 on the InPatient table) for subsequent status-change events.
 */
export async function getInpatientBoard(session: Session): Promise<InpatientBoardEntry[]> {
  const repo = new QueueRepository(getSupabaseClient(), session.hospitalId);
  return repo.getInpatientBoard();
}
