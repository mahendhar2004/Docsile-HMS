/**
 * MSW handlers for the Workup module.
 *
 * Endpoints:
 *   GET  /workup/queue                           → WorkupQueuePatient[]
 *   GET  /workup/patients/:patientId             → WorkupPatient
 *   POST /workup/patients/:patientId/eye-readings → EyeReadingRecord
 */

import { http } from "msw"
import { ok, created, fail } from "../envelope"
import {
  workupQueuePatients,
  workupPatientDetail,
  nextEyeReadingId,
} from "../fixtures/workup"

export const workupHandlers = [
  // ── Today's workup queue ────────────────────────────────────────────────────
  http.get("/workup/queue", () => {
    return ok(workupQueuePatients)
  }),

  // ── Single patient workup detail ────────────────────────────────────────────
  http.get("/workup/patients/:patientId", ({ params }) => {
    const patientId = String(params.patientId)
    const patient = workupPatientDetail[patientId]
    if (!patient) return fail("Workup patient not found", 404)
    return ok(patient)
  }),

  // ── Save eye reading (upsert) ────────────────────────────────────────────────
  http.post("/workup/patients/:patientId/eye-readings", async ({ params, request }) => {
    const patientId = String(params.patientId)
    const body = await request.json() as Record<string, unknown>

    const newReading = {
      id: nextEyeReadingId(),
      patientId,
      prescriptionId: null as string | null,
      readingDate: String(body.readingDate ?? new Date().toISOString().slice(0, 10)),
      autoRefractometer: (body.autoRefractometer as string | null) ?? null,
      glassesReading: null as string | null,
      previousPrescription: (body.previousPrescription as string | null) ?? null,
      presentPrescription: (body.presentPrescription as string | null) ?? null,
      clinicalFindings: (body.clinicalFindings as string | null) ?? null,
      createdById: "mock-admin-id",
      hospitalId: "mock-hospital-id",
      createdAt: new Date().toISOString(),
    }

    // Update the in-memory queue and detail so refetch reflects the change.
    const queuePatient = workupQueuePatients.find((p) => p.patientId === patientId)
    if (queuePatient) {
      queuePatient.eyeReadings = [newReading]
      queuePatient.status = "WORKUP_DONE"
    }
    if (workupPatientDetail[patientId]) {
      workupPatientDetail[patientId].eyeReadings = [newReading]
      workupPatientDetail[patientId].status = "WORKUP_DONE"
    }

    return created(newReading)
  }),
]
