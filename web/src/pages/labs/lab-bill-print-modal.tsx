/**
 * labs/lab-bill-print-modal.tsx
 *
 * Preview-then-print dialog for a single lab bill — ported from main's
 * ReportPrintModal.tsx "lab" mode (src/app/(hospital)/reports/components/
 * ReportPrintModal.tsx). This was entirely missing from the migrated
 * BillsTab's history table (no print action at all, not just styled
 * differently).
 *
 * Reuses the shared receipt components already ported this session
 * (ReceiptLayout/ReceiptHeader/PatientInfoSection) and the cross-module
 * useHospitalProfile hook (settings/hooks.ts), same pattern as the
 * Pharmacy/Optical bill print modals built alongside this one.
 *
 * Not ported: main's "Vennela/Vennala lab" special-cased receipt layout
 * (VennelaLabReceipt) — that's a specific real lab's hardcoded letterhead,
 * same category of real-customer branding the receipt header registry
 * (@/components/receipts/headers/registry.ts) deliberately excludes. Every
 * lab uses the generic ReceiptHeader/registry path here instead.
 */

import { useRef } from "react"
import { Loader2, Printer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ReceiptLayout, ReceiptFooter } from "@/components/receipts/ReceiptLayout"
import { ReceiptHeader } from "@/components/receipts/ReceiptHeader"
import { PatientInfoSection } from "@/components/receipts/PatientInfoSection"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { formatDate } from "@/lib/utils"
import { useHospitalProfile } from "@/pages/settings/hooks"
import type { LabBillRow } from "./types"

interface Props {
  open: boolean
  onClose: () => void
  bill: LabBillRow | null
}

export function LabBillPrintModal({ open, onClose, bill }: Props) {
  const { data: hospitalProfile, isLoading } = useHospitalProfile(open)
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const html = printRef.current?.innerHTML ?? ""
    if (!html || !bill) return
    printReceiptsHtml({ title: `Print - ${bill.billNumber}`, contentHtml: html })
  }

  if (!bill) return null

  const hospitalInfo = hospitalProfile
    ? {
        name: hospitalProfile.name,
        displayName: hospitalProfile.displayName,
        address: hospitalProfile.address,
        phone: hospitalProfile.phone,
        email: hospitalProfile.email,
        website: hospitalProfile.website,
        registrationNo: hospitalProfile.registrationNo,
        logoUrl: hospitalProfile.logoUrl,
      }
    : { name: "Hospital" }

  const hospitalName = hospitalProfile?.displayName || hospitalProfile?.name || "Hospital"
  const patient = bill.patient
  const fullName = `${patient.firstName} ${patient.lastName ?? ""}`.trim()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="lg" className="max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border flex-row items-center justify-between">
          <DialogTitle className="text-base">Print — {bill.billNumber}</DialogTitle>
          <Button size="sm" onClick={handlePrint} disabled={isLoading} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : (
            <div ref={printRef}>
              <ReceiptLayout footer={<ReceiptFooter hospitalName={hospitalName} />}>
                <div className="receipt-header-section">
                  <ReceiptHeader
                    hospital={hospitalInfo}
                    headerOverrideKey={bill.lab.printHeaderKey ?? undefined}
                  />
                </div>
                <h2 className="text-sm text-center font-bold py-1 mb-2">LAB BILL</h2>
                <PatientInfoSection
                  data={{
                    patientName: fullName,
                    patientId: patient.patientId,
                    date: formatDate(bill.createdAt),
                    mobile: patient.phone || "—",
                    gender: patient.gender || "—",
                    age: String(patient.age ?? "—"),
                    address: patient.address || "—",
                    receiptNo: bill.billNumber,
                    doctorName: "—",
                  }}
                />

                <div className="pb-3 mb-4 no-break">
                  <h3 className="text-xs font-bold mb-2">{bill.lab.name}</h3>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className="border border-black p-2 text-left font-bold w-[10%]">S.No</th>
                        <th className="border border-black p-2 text-left font-bold">TEST NAME</th>
                        <th className="border border-black p-2 text-right font-bold w-[25%]">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.items.map((item, i) => (
                        <tr key={i}>
                          <td className="border border-black p-2">{i + 1}</td>
                          <td className="border border-black p-2">{item.name}</td>
                          <td className="border border-black p-2 text-right">
                            {item.amount.toLocaleString("en-IN")}
                          </td>
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
                        <td className="border border-black p-2 text-right font-bold">
                          {bill.subtotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                      {bill.discount > 0 && (
                        <tr>
                          <td className="border border-black p-2 font-bold">DISCOUNT</td>
                          <td className="border border-black p-2 text-right font-bold">
                            - {bill.discount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-black p-2 font-bold">TOTAL</td>
                        <td className="border border-black p-2 text-right font-bold">
                          {bill.total.toLocaleString("en-IN")}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2 font-bold">AMOUNT PAID</td>
                        <td className="border border-black p-2 text-right font-bold">
                          {bill.amountPaid.toLocaleString("en-IN")}
                        </td>
                      </tr>
                      {bill.balanceDue > 0 && (
                        <tr>
                          <td className="border border-black p-2 font-bold text-red-700">BALANCE DUE</td>
                          <td className="border border-black p-2 text-right font-bold text-red-700">
                            {bill.balanceDue.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </ReceiptLayout>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
