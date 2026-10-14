/**
 * reports/report-print-modal.tsx
 *
 * Tabbed print modal for the Reports module — Cash Receipt/Prescription/
 * Readings & Findings/Full Report (prescription mode), Lab Bill (lab mode),
 * Bill Summary/Discharge Summary (inpatient mode). Ported from main's
 * src/app/(hospital)/reports/components/ReportPrintModal.tsx.
 *
 * Replaces the "Print functionality coming soon." toast stubs previously in
 * prescriptions-tab.tsx/lab-records-tab.tsx/inpatient-records-tab.tsx — the
 * backend endpoint (GET /reports/patients/:id/receipt, service.ts's
 * getPatientReceipt) already existed and already matched main's real
 * getReportReceiptData() field-for-field; it was simply never called from
 * the frontend.
 *
 * Deliberately NOT ported: main's hospital-specific VennelaLabReceipt branch
 * (a one-off branded layout for a single named lab partner, selected by
 * matching "vennela"/"vennala" in the lab's printHeaderKey/name). This port
 * always uses the generic lab-bill layout main itself falls back to for
 * every other lab — a narrow, single-tenant branding special case, not a
 * structural capability gap.
 */

import { useEffect, useRef, useState } from "react"
import { Loader2, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CashReceipt } from "@/components/receipts/CashReceipt"
import { PrescriptionReceipt } from "@/components/receipts/PrescriptionReceipt"
import { ReadingsReceipt } from "@/components/receipts/ReadingsReceipt"
import { ClinicalFindingsReceipt } from "@/components/receipts/ClinicalFindingsReceipt"
import { ReadingsAndFindings } from "@/components/receipts/ReadingsAndFindings"
import { ReceiptHeader } from "@/components/receipts/ReceiptHeader"
import { ReceiptLayout, ReceiptFooter } from "@/components/receipts/ReceiptLayout"
import { PatientInfoSection } from "@/components/receipts/PatientInfoSection"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { toGlassShape } from "@/lib/glass-prescription"
import { formatDate, calculateAge } from "@/lib/utils"
import { usePatientReceipt } from "./hooks"
import type { InpatientRecord } from "./types"

const TAB_CLASS =
  "rounded-none px-3 py-2 text-xs font-medium border-b-2 border-transparent " +
  "text-muted-foreground hover:text-foreground transition-colors " +
  "data-[state=active]:border-primary data-[state=active]:text-primary " +
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none"

type EyeCell = { sph: string; cyl: string; axis: string; va: string; vacPh?: string }
type ArReading = { rightEye: EyeCell; leftEye: EyeCell }

interface ClinicalEye {
  lids: string; conjunctiva: string; cornea: string; ac: string; iris: string
  pupil: string; lens: string; tension: string; fundus: string; opticDisk: string
  macula: string; vessels: string; peripheralRetina: string; retinoscopy: string
  retino1: string; retino2: string; retino3: string; retino4: string
}

const DEFAULT_CLINICAL_EYE: ClinicalEye = {
  lids: "Normal", conjunctiva: "Normal", cornea: "Clear", ac: "Normal",
  iris: "Normal", pupil: "Normal", lens: "Clear", tension: "—",
  fundus: "—", opticDisk: "Normal", macula: "—", vessels: "—",
  peripheralRetina: "—", retinoscopy: "—", retino1: "—", retino2: "—", retino3: "—", retino4: "—",
}

export interface ReportPrintPatient {
  id: string
  patientId: string
  fullName: string
  phone?: string | null
  age?: number | null
  gender?: string | null
  dateOfBirth?: string | null
  address?: string | null
}

export interface ReportLabBillPrintData {
  billNumber: string
  labName: string
  total: number
  amountPaid: number
  balanceDue: number
  discount: number
  subtotal: number
  paymentMode?: string | null
  items: { name: string; amount: number }[]
  createdAt: string
  printHeaderKey?: string | null
}

interface ReportPrintModalProps {
  open: boolean
  onClose: () => void
  patient: ReportPrintPatient
  mode: "prescription" | "lab" | "inpatient"
  /** For prescription mode: the prescription ID to focus on (defaults to latest). */
  prescriptionId?: string
  /** For lab mode: lab bill data. */
  labBill?: ReportLabBillPrintData
  /** For inpatient mode: inpatient record data. */
  inpatientRecord?: InpatientRecord
}

export function ReportPrintModal({
  open,
  onClose,
  patient,
  mode,
  prescriptionId,
  labBill,
  inpatientRecord,
}: ReportPrintModalProps) {
  const [activeTab, setActiveTab] = useState("cash")
  const [readingsSubTab, setReadingsSubTab] = useState<"readings" | "clinical" | "both">("both")
  const printRef = useRef<HTMLDivElement>(null)

  const { data, isLoading: loading } = usePatientReceipt(patient.id, open)

  useEffect(() => {
    if (!open) return
    if (mode === "prescription") setActiveTab("cash")
    else if (mode === "lab") setActiveTab("lab-bill")
    else if (mode === "inpatient") setActiveTab("ip-bill")
  }, [open, mode])

  function handlePrint() {
    if (!printRef.current) return
    const content = printRef.current.innerHTML
    if (!content) return
    printReceiptsHtml({ title: `Print — ${patient.fullName}`, contentHtml: content })
  }

  const patientData = data?.patient
  const hospital = data?.hospital

  const hospitalInfo = hospital ?? { name: "Hospital" }
  const hospitalName = hospital?.displayName || hospital?.name || "Hospital"

  const allPrescriptions = patientData?.prescriptions ?? []
  const prescription = prescriptionId
    ? (allPrescriptions.find((rx) => rx.id === prescriptionId) ?? allPrescriptions[0])
    : allPrescriptions[0]

  const eyeReading = patientData?.eyeReadings?.[0]

  const patientInfo = patientData
    ? {
        patientName: `${patientData.firstName} ${patientData.lastName ?? ""}`.trim(),
        patientId: patientData.patientId,
        date: formatDate(prescription?.prescriptionDate ?? patientData.appointmentDate),
        mobile: patientData.phone || "—",
        gender: patientData.gender,
        age: String(patientData.age ?? (patientData.dateOfBirth ? calculateAge(patientData.dateOfBirth) : "—")),
        address: patientData.address || "—",
        referredBy: patientData.referredBy || undefined,
        receiptNo: prescription?.prescriptionNumber || undefined,
        doctorName: prescription?.doctorName || patientData.doctorName || "—",
        department: prescription?.department || patientData.department || undefined,
      }
    : null

  let medicines: { name: string; timing: string; days: string; note?: string }[] = []
  if (prescription?.medicines) {
    try {
      medicines = JSON.parse(prescription.medicines)
    } catch {
      /* empty */
    }
  }

  let investigations: string[] = []
  if (prescription?.investigations) {
    try {
      const parsed = JSON.parse(prescription.investigations) as (string | { name: string })[]
      investigations = parsed.map((i) => (typeof i === "string" ? i : i.name)).filter(Boolean)
    } catch {
      /* empty */
    }
  }

  let arReading: ArReading | undefined
  let previousGlass: ReturnType<typeof toGlassShape> | undefined
  let presentGlass: ReturnType<typeof toGlassShape> | undefined
  let clinicalFindings: { rightEye: ClinicalEye; leftEye: ClinicalEye } | undefined

  if (eyeReading) {
    if (eyeReading.autoRefractometer) {
      try {
        const ar = JSON.parse(eyeReading.autoRefractometer)
        arReading = {
          rightEye: { sph: ar.re?.sph || "", cyl: ar.re?.cyl || "", axis: ar.re?.axis || "", va: ar.re?.va || "", vacPh: ar.re?.vacPh || "" },
          leftEye: { sph: ar.le?.sph || "", cyl: ar.le?.cyl || "", axis: ar.le?.axis || "", va: ar.le?.va || "", vacPh: ar.le?.vacPh || "" },
        }
      } catch {
        /* empty */
      }
    }
    if (eyeReading.previousPrescription) {
      try {
        previousGlass = toGlassShape(JSON.parse(eyeReading.previousPrescription))
      } catch {
        /* empty */
      }
    }
    if (eyeReading.presentPrescription) {
      try {
        presentGlass = toGlassShape(JSON.parse(eyeReading.presentPrescription))
      } catch {
        /* empty */
      }
    }
    if (eyeReading.clinicalFindings) {
      try {
        const cf = JSON.parse(eyeReading.clinicalFindings)
        clinicalFindings = {
          rightEye: { ...DEFAULT_CLINICAL_EYE, ...cf.re },
          leftEye: { ...DEFAULT_CLINICAL_EYE, ...cf.le },
        }
      } catch {
        /* empty */
      }
    }
  }

  // ─── Inpatient-mode derived data ─────────────────────────────────────────────
  const ip = inpatientRecord
  const ipDoctors: string[] = (() => {
    try {
      return ip?.doctorNames ? JSON.parse(ip.doctorNames) : []
    } catch {
      return []
    }
  })()
  const dischargeSummary = (() => {
    try {
      const parsed = ip?.dischargeNotes ? JSON.parse(ip.dischargeNotes) : null
      if (parsed && typeof parsed === "object" && (parsed.diagnosis || parsed.conditionAtDischarge || parsed.medications || parsed.followUpInstructions || parsed.notes)) {
        return parsed as { diagnosis?: string; conditionAtDischarge?: string; medications?: string; followUpInstructions?: string; notes?: string }
      }
      return null
    } catch {
      return null
    }
  })()
  const ipPrescriptions: { medicine: string; days: string; timing: string }[] = (() => {
    try {
      const parsed = ip?.prescriptions ? JSON.parse(ip.prescriptions) : []
      return Array.isArray(parsed) ? parsed.filter((m: { medicine?: string }) => m.medicine?.trim()) : []
    } catch {
      return []
    }
  })()
  const paymentRecords: { date?: string; amount?: number; mode?: string; amountType?: string; paymentMode?: string }[] = (() => {
    try {
      return ip?.paymentRecords ? JSON.parse(ip.paymentRecords) : []
    } catch {
      return []
    }
  })()
  const daysAdmitted =
    ip?.admissionDate && ip.dischargeDate
      ? Math.max(1, Math.ceil((new Date(ip.dischargeDate).getTime() - new Date(ip.admissionDate).getTime()) / 86400000))
      : null
  const ipInfo = ip
    ? {
        patientName: ip.name,
        patientId: ip.ipNumber,
        date: formatDate(ip.admissionDate),
        mobile: patient.phone || "—",
        gender: patient.gender || "—",
        age: String(patient.age ?? "—"),
        address: patient.address || "—",
        doctorName: ipDoctors.join(", ") || "—",
        department: ip.department || undefined,
      }
    : null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[870px] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">Print — {patient.fullName}</DialogTitle>
          <Button size="sm" onClick={handlePrint} disabled={loading} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
          </Button>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-border px-4">
              <TabsList className="bg-transparent h-auto p-0 rounded-none gap-0 -mb-px">
                {mode === "prescription" && (
                  <>
                    <TabsTrigger value="cash" className={TAB_CLASS}>Cash Receipt</TabsTrigger>
                    <TabsTrigger value="prescription" className={TAB_CLASS}>Prescription</TabsTrigger>
                    {eyeReading && <TabsTrigger value="readings" className={TAB_CLASS}>Readings & Findings</TabsTrigger>}
                    <TabsTrigger value="report" className={TAB_CLASS}>Full Report</TabsTrigger>
                  </>
                )}
                {mode === "lab" && <TabsTrigger value="lab-bill" className={TAB_CLASS}>Lab Bill</TabsTrigger>}
                {mode === "inpatient" && (
                  <>
                    <TabsTrigger value="ip-bill" className={TAB_CLASS}>Bill Summary</TabsTrigger>
                    <TabsTrigger value="ip-discharge" className={TAB_CLASS}>Discharge Summary</TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
              <div ref={printRef}>
                {mode === "prescription" && (
                  <>
                    <TabsContent value="cash" className="mt-0">
                      {patientInfo && prescription ? (
                        <CashReceipt
                          hospital={hospitalInfo}
                          patient={patientInfo}
                          payment={{
                            mode: prescription.paymentMode || "Cash",
                            totalAmount: prescription.subtotal ?? prescription.total ?? 0,
                            discount: prescription.discount ?? 0,
                            amountReceived: prescription.amountPaid ?? 0,
                            amountDue: prescription.balanceDue ?? 0,
                            paidFor: prescription.items?.map((i) => i.description).join(", ") || undefined,
                          }}
                          items={prescription.items?.map((i) => ({ description: i.description, amount: i.amount })) || undefined}
                        />
                      ) : (
                        <div className="text-center py-16 text-muted-foreground text-sm bg-white rounded-lg border">
                          No billing data available for this prescription
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="prescription" className="mt-0">
                      {patientInfo && (
                        <PrescriptionReceipt
                          hospital={hospitalInfo}
                          patient={patientInfo}
                          vitals={prescription ? {
                            temperature: prescription.temperature ? String(prescription.temperature) : undefined,
                            pulseRate: prescription.pulseRate ? String(prescription.pulseRate) : undefined,
                            spo2: prescription.spo2 ? String(prescription.spo2) : undefined,
                          } : undefined}
                          history={prescription ? {
                            presentComplaint: prescription.presentComplaint || undefined,
                            previousHistory: prescription.previousHistory || undefined,
                            diagnosis: prescription.diagnosis || undefined,
                          } : undefined}
                          medicines={medicines}
                          investigations={investigations}
                          advice={prescription?.additionalNotes || undefined}
                          followUpDate={prescription?.followUpDate ? formatDate(prescription.followUpDate) : undefined}
                          notes={prescription?.notes || undefined}
                        />
                      )}
                    </TabsContent>

                    {eyeReading && (
                      <TabsContent value="readings" className="mt-0 space-y-4">
                        <div className="flex gap-1 bg-white rounded-lg border p-1 w-fit mx-auto">
                          {(["readings", "clinical", "both"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setReadingsSubTab(t)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                readingsSubTab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {t === "readings" ? "Readings" : t === "clinical" ? "Clinical Findings" : "Both"}
                            </button>
                          ))}
                        </div>

                        {readingsSubTab === "readings" && patientInfo && (
                          <ReadingsReceipt hospital={hospitalInfo} patient={patientInfo} arReading={arReading} previousGlass={previousGlass} presentGlass={presentGlass} />
                        )}
                        {readingsSubTab === "clinical" && clinicalFindings && (
                          <ClinicalFindingsReceipt hospital={hospitalInfo} rightEye={clinicalFindings.rightEye} leftEye={clinicalFindings.leftEye} />
                        )}
                        {readingsSubTab === "both" && patientInfo && (
                          <ReadingsAndFindings hospital={hospitalInfo} patient={patientInfo} arReading={arReading} previousGlass={previousGlass} presentGlass={presentGlass} clinicalFindings={clinicalFindings} />
                        )}
                      </TabsContent>
                    )}

                    <TabsContent value="report" className="mt-0 space-y-0">
                      {patientInfo && (
                        <>
                          <PrescriptionReceipt
                            hospital={hospitalInfo}
                            patient={patientInfo}
                            vitals={prescription ? {
                              temperature: prescription.temperature ? String(prescription.temperature) : undefined,
                              pulseRate: prescription.pulseRate ? String(prescription.pulseRate) : undefined,
                              spo2: prescription.spo2 ? String(prescription.spo2) : undefined,
                            } : undefined}
                            history={prescription ? {
                              presentComplaint: prescription.presentComplaint || undefined,
                              previousHistory: prescription.previousHistory || undefined,
                              diagnosis: prescription.diagnosis || undefined,
                            } : undefined}
                            medicines={medicines}
                            investigations={investigations}
                            advice={prescription?.additionalNotes || undefined}
                            followUpDate={prescription?.followUpDate ? formatDate(prescription.followUpDate) : undefined}
                            notes={prescription?.notes || undefined}
                          />
                          {eyeReading && (
                            <ReadingsAndFindings hospital={hospitalInfo} patient={patientInfo} arReading={arReading} previousGlass={previousGlass} presentGlass={presentGlass} clinicalFindings={clinicalFindings} />
                          )}
                        </>
                      )}
                    </TabsContent>
                  </>
                )}

                {mode === "lab" && labBill && (
                  <TabsContent value="lab-bill" className="mt-0">
                    <ReceiptLayout footer={<ReceiptFooter hospitalName={hospitalName} />}>
                      <div className="receipt-header-section">
                        <ReceiptHeader hospital={hospitalInfo} headerOverrideKey={labBill.printHeaderKey ?? undefined} />
                      </div>
                      <h2 className="text-sm text-center font-bold py-1 mb-2">LAB BILL</h2>
                      <PatientInfoSection data={{
                        patientName: patient.fullName,
                        patientId: patient.patientId,
                        date: formatDate(labBill.createdAt),
                        mobile: patient.phone || "—",
                        gender: patient.gender || "—",
                        age: String(patient.age ?? "—"),
                        address: patient.address || "—",
                        receiptNo: labBill.billNumber,
                        doctorName: "—",
                      }} />

                      <div className="pb-3 mb-4 no-break">
                        <h3 className="text-xs font-bold mb-2">{labBill.labName}</h3>
                        <table className="w-full border-collapse text-[11px]">
                          <thead>
                            <tr>
                              <th className="border border-black p-2 text-left font-bold w-[10%]">S.No</th>
                              <th className="border border-black p-2 text-left font-bold">TEST NAME</th>
                              <th className="border border-black p-2 text-right font-bold w-[25%]">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {labBill.items.map((item, i) => (
                              // eslint-disable-next-line react/no-array-index-key
                              <tr key={i}>
                                <td className="border border-black p-2">{i + 1}</td>
                                <td className="border border-black p-2">{item.name}</td>
                                <td className="border border-black p-2 text-right">{item.amount.toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pb-3 no-break">
                        <table className="w-full border-collapse text-[11px]">
                          <tbody>
                            <tr>
                              <td className="border border-black p-2 font-bold">SUBTOTAL</td>
                              <td className="border border-black p-2 text-right font-bold">{labBill.subtotal.toLocaleString("en-IN")}</td>
                            </tr>
                            {labBill.discount > 0 && (
                              <tr>
                                <td className="border border-black p-2 font-bold">DISCOUNT</td>
                                <td className="border border-black p-2 text-right font-bold">- {labBill.discount.toLocaleString("en-IN")}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="border border-black p-2 font-bold">TOTAL</td>
                              <td className="border border-black p-2 text-right font-bold">{labBill.total.toLocaleString("en-IN")}</td>
                            </tr>
                            <tr>
                              <td className="border border-black p-2 font-bold">AMOUNT PAID</td>
                              <td className="border border-black p-2 text-right font-bold">{labBill.amountPaid.toLocaleString("en-IN")}</td>
                            </tr>
                            {labBill.balanceDue > 0 && (
                              <tr>
                                <td className="border border-black p-2 font-bold text-red-700">BALANCE DUE</td>
                                <td className="border border-black p-2 text-right font-bold text-red-700">{labBill.balanceDue.toLocaleString("en-IN")}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </ReceiptLayout>
                  </TabsContent>
                )}

                {mode === "inpatient" && ip && ipInfo && (
                  <>
                    <TabsContent value="ip-bill" className="mt-0">
                      <ReceiptLayout footer={<ReceiptFooter hospitalName={hospitalName} />}>
                        <div className="receipt-header-section">
                          <ReceiptHeader hospital={hospitalInfo} />
                        </div>
                        <h2 className="text-sm text-center font-bold py-1 mb-2">BILL SUMMARY</h2>
                        <PatientInfoSection data={ipInfo} />

                        <div className="pb-3 mb-4 no-break">
                          <table className="w-full border-collapse text-[11px]">
                            <tbody>
                              <tr>
                                <td className="border border-black p-2 font-bold">PACKAGE AMOUNT</td>
                                <td className="border border-black p-2 text-right font-bold">{ip.packageAmount.toLocaleString("en-IN")}</td>
                              </tr>
                              {ip.discount > 0 && (
                                <tr>
                                  <td className="border border-black p-2 font-bold">DISCOUNT</td>
                                  <td className="border border-black p-2 text-right font-bold">- {ip.discount.toLocaleString("en-IN")}</td>
                                </tr>
                              )}
                              <tr>
                                <td className="border border-black p-2 font-bold">NET AMOUNT</td>
                                <td className="border border-black p-2 text-right font-bold">{ip.netAmount.toLocaleString("en-IN")}</td>
                              </tr>
                              <tr>
                                <td className="border border-black p-2 font-bold">AMOUNT RECEIVED</td>
                                <td className="border border-black p-2 text-right font-bold">{ip.totalReceivedAmount.toLocaleString("en-IN")}</td>
                              </tr>
                              <tr>
                                <td className="border border-black p-2 font-bold">BALANCE DUE</td>
                                <td className="border border-black p-2 text-right font-bold">{ip.balanceAmount.toLocaleString("en-IN")}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {paymentRecords.length > 0 && (
                          <div className="pb-3 mb-4 no-break">
                            <h3 className="text-xs font-bold mb-2">PAYMENT HISTORY</h3>
                            <table className="w-full border-collapse text-[11px]">
                              <thead>
                                <tr>
                                  <th className="border border-black p-2 text-left font-bold">DATE</th>
                                  <th className="border border-black p-2 text-left font-bold">TYPE</th>
                                  <th className="border border-black p-2 text-left font-bold">MODE</th>
                                  <th className="border border-black p-2 text-right font-bold">AMOUNT</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paymentRecords.map((p, i) => (
                                  // eslint-disable-next-line react/no-array-index-key
                                  <tr key={i}>
                                    <td className="border border-black p-2">{p.date ? formatDate(p.date) : "—"}</td>
                                    <td className="border border-black p-2">{p.amountType || "—"}</td>
                                    <td className="border border-black p-2">{p.paymentMode || p.mode || "—"}</td>
                                    <td className="border border-black p-2 text-right">{(p.amount ?? 0).toLocaleString("en-IN")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </ReceiptLayout>
                    </TabsContent>

                    <TabsContent value="ip-discharge" className="mt-0">
                      <ReceiptLayout footer={<ReceiptFooter hospitalName={hospitalName} />}>
                        <div className="receipt-header-section">
                          <ReceiptHeader hospital={hospitalInfo} />
                        </div>
                        <h2 className="text-sm text-center font-bold py-1 mb-2">DISCHARGE SUMMARY</h2>
                        <PatientInfoSection data={ipInfo} />

                        <div className="pb-3 mb-4 border-b border-black no-break">
                          <h3 className="text-xs font-bold mb-3">ADMISSION DETAILS</h3>
                          <div className="text-[11px] grid grid-cols-3 gap-x-4 gap-y-2">
                            <div><div className="font-bold">ADMISSION DATE</div><div>{formatDate(ip.admissionDate)}</div></div>
                            <div><div className="font-bold">DISCHARGE DATE</div><div>{ip.dischargeDate ? formatDate(ip.dischargeDate) : "—"}</div></div>
                            {daysAdmitted && <div><div className="font-bold">DAYS STAYED</div><div>{daysAdmitted} days</div></div>}
                            {ip.operationName && (
                              <>
                                <div><div className="font-bold">OPERATION</div><div>{ip.operationName}</div></div>
                                <div><div className="font-bold">OPERATION DATE</div><div>{ip.operationDate ? formatDate(ip.operationDate) : "—"}</div></div>
                                <div><div className="font-bold">PROV. DIAGNOSIS</div><div>{ip.provisionDiagnosis ?? "—"}</div></div>
                              </>
                            )}
                          </div>
                        </div>

                        {dischargeSummary && (
                          <div className="pb-3 mb-4 border-b border-black no-break">
                            <h3 className="text-xs font-bold mb-3">CLINICAL DETAILS</h3>
                            <div className="text-[11px] space-y-2">
                              {dischargeSummary.diagnosis && (
                                <div><div className="font-bold">DISCHARGE DIAGNOSIS</div><div className="whitespace-pre-wrap">{dischargeSummary.diagnosis}</div></div>
                              )}
                              {dischargeSummary.conditionAtDischarge && (
                                <div><div className="font-bold">CONDITION AT DISCHARGE</div><div>{dischargeSummary.conditionAtDischarge}</div></div>
                              )}
                              {dischargeSummary.medications && (
                                <div><div className="font-bold">MEDICATIONS ON DISCHARGE</div><div className="whitespace-pre-wrap">{dischargeSummary.medications}</div></div>
                              )}
                              {dischargeSummary.followUpInstructions && (
                                <div><div className="font-bold">FOLLOW-UP INSTRUCTIONS</div><div className="whitespace-pre-wrap">{dischargeSummary.followUpInstructions}</div></div>
                              )}
                              {dischargeSummary.notes && (
                                <div><div className="font-bold">ADDITIONAL NOTES</div><div className="whitespace-pre-wrap">{dischargeSummary.notes}</div></div>
                              )}
                            </div>
                          </div>
                        )}

                        {ipPrescriptions.length > 0 && (
                          <div className="pb-3 mb-4 border-b border-black no-break">
                            <h3 className="text-xs font-bold mb-2">DISCHARGE PRESCRIPTION</h3>
                            <table className="w-full border-collapse text-[11px]">
                              <thead>
                                <tr>
                                  <th className="border border-black p-2 text-left font-bold w-[8%]">#</th>
                                  <th className="border border-black p-2 text-left font-bold">MEDICINE</th>
                                  <th className="border border-black p-2 text-center font-bold w-[15%]">TIMING</th>
                                  <th className="border border-black p-2 text-center font-bold w-[15%]">DAYS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ipPrescriptions.map((rx, i) => (
                                  // eslint-disable-next-line react/no-array-index-key
                                  <tr key={i}>
                                    <td className="border border-black p-2">{i + 1}</td>
                                    <td className="border border-black p-2">{rx.medicine}</td>
                                    <td className="border border-black p-2 text-center">{rx.timing}</td>
                                    <td className="border border-black p-2 text-center">{rx.days}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {ip.followUpDate && (
                          <div className="text-[11px] mt-3 no-break">
                            <span className="font-bold">FOLLOW-UP DATE: </span>
                            <span>{formatDate(ip.followUpDate)}</span>
                          </div>
                        )}
                      </ReceiptLayout>
                    </TabsContent>
                  </>
                )}
              </div>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
