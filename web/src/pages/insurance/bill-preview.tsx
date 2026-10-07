/**
 * insurance/bill-preview.tsx
 *
 * Editable bill-preview screen opened by the claim detail panel's "Final
 * Bill" / "Enhancement" / "Cash Receipt" buttons — matches main's
 * InsuranceBillPreview.tsx exactly: a 3-column layout (Settings / Billing
 * Items / Amounts cards on the left, a live scaled-down preview of the
 * actual A4 bill on the right), seeded from the claim's own data but fully
 * editable before printing.
 *
 * Differs from main only in plumbing, not behavior:
 *   - Takes the already-loaded `claim` as a prop instead of re-fetching by
 *     claimId (the parent panel already has it via useInsuranceClaim).
 *   - Printing goes through this app's existing printReceiptsHtml (same
 *     pipeline as Patients/Doctor/Pharmacy/Optical/Labs quick-print)
 *     instead of main's bespoke stylesheet-copying window.open — simpler,
 *     and consistent with the rest of this app's print flow.
 */

import { useRef, useState } from "react"
import { Plus, Printer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { printReceiptsHtml } from "@/lib/print-receipts"
import { InsuranceFinalBill } from "@/components/receipts/InsuranceFinalBill"
import { InsuranceEnhancementBill } from "@/components/receipts/InsuranceEnhancementBill"
import { InsuranceCashReceipt } from "@/components/receipts/InsuranceCashReceipt"
import type { InsuranceClaim, PackageInclusion } from "./types"

export type BillType = "final" | "enhancement" | "cash"

interface Props {
  claim: InsuranceClaim
  billType: BillType
  onBack: () => void
}

interface BillingItem {
  particulars: string
  amount: number
}

const BILL_LABELS: Record<BillType, string> = {
  final: "Final Bill",
  enhancement: "Enhancement Bill",
  cash: "Cash Receipt",
}

function parseDoctors(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function buildBillingItems(raw: string | null): BillingItem[] {
  let inclusions: PackageInclusion[] = []
  try {
    inclusions = raw ? (JSON.parse(raw) as PackageInclusion[]) : []
  } catch {
    inclusions = []
  }
  const items: BillingItem[] = []
  for (const item of inclusions) {
    items.push({ particulars: item.name, amount: item.amount })
    if (item.subItems) {
      for (const sub of item.subItems) {
        items.push({ particulars: `  - ${sub.itemName} x${sub.quantity}`, amount: sub.amount })
      }
    }
  }
  return items
}

export function BillPreview({ claim, billType, onBack }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  const doctors = parseDoctors(claim.doctorNames)

  // Editable state — seeded from the claim, matches main's exact field set.
  const [billingItems, setBillingItems] = useState<BillingItem[]>(() => {
    const items = buildBillingItems(claim.packageInclusions)
    return items.length > 0 ? items : [{ particulars: "", amount: 0 }]
  })
  const [headerHeight, setHeaderHeight] = useState(120)
  const [billDate, setBillDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(claim.createdAt)),
  )

  const [totalAmount, setTotalAmount] = useState(claim.packageAmount)
  const [discountAmount, setDiscountAmount] = useState(claim.discount)
  const [netAmount, setNetAmount] = useState(claim.totalBillAmount)

  const [preauthAmount, setPreauthAmount] = useState(claim.preauthAmount)
  const [enhancementApproved, setEnhancementApproved] = useState(claim.enhancementApproved)
  const [totalApproved, setTotalApproved] = useState(claim.totalApprovedAmount)
  const [finalSettled, setFinalSettled] = useState(claim.finalSettledAmount)
  const [deductions, setDeductions] = useState(claim.deductions)
  const [patientPayable, setPatientPayable] = useState(claim.patientPayableAmount)

  const [enhancementAmount, setEnhancementAmount] = useState(claim.enhancementAmount)
  const [excessAmount, setExcessAmount] = useState(claim.patientPayableAmount)

  const [amountReceived, setAmountReceived] = useState(claim.patientPaidAmount)
  const [patientBalance, setPatientBalance] = useState(claim.patientBalance)

  function handlePrint() {
    setPrinting(true)
    setTimeout(() => {
      const html = printRef.current?.innerHTML ?? ""
      printReceiptsHtml({ title: BILL_LABELS[billType], contentHtml: html })
      setPrinting(false)
    }, 50)
  }

  function addBillingItem() {
    setBillingItems((prev) => [...prev, { particulars: "", amount: 0 }])
  }

  function removeBillingItem(index: number) {
    setBillingItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateBillingItem(index: number, field: keyof BillingItem, value: string | number) {
    setBillingItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const validItems = billingItems.filter((i) => i.particulars.trim() !== "")

  const patientData = {
    patientName: claim.patientName,
    patientId: claim.ipNumber,
    gender: claim.gender,
    age: String(claim.age),
    admissionDate: claim.admissionDate ?? "",
    dischargeDate: claim.dischargeDate ?? "",
    doctorSpecialization: doctors.join(", ") || "—",
    department: claim.department ?? "—",
  }

  return (
    <div className="py-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {BILL_LABELS[billType]} Preview
          </h3>
        </div>
        <Button onClick={handlePrint} disabled={printing} className="gap-2">
          <Printer className="h-4 w-4" aria-hidden /> Print {BILL_LABELS[billType]}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Editable fields */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Settings</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Letterhead Space (px)</Label>
                <Input
                  type="number"
                  value={headerHeight}
                  onChange={(e) => setHeaderHeight(Number(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bill Date</Label>
                <Input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Items</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addBillingItem}>
                  <Plus className="h-3 w-3" aria-hidden /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {billingItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      value={item.particulars}
                      onChange={(e) => updateBillingItem(i, "particulars", e.target.value)}
                      placeholder="Particulars"
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) => updateBillingItem(i, "amount", Number(e.target.value) || 0)}
                      placeholder="Amount"
                      className="h-8 text-xs w-24"
                    />
                    {billingItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBillingItem(i)}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amounts</p>

              {(billType === "final" || billType === "cash") && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Total Amount</Label>
                      <Input type="number" value={totalAmount || ""} onChange={(e) => setTotalAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Discount</Label>
                      <Input type="number" value={discountAmount || ""} onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Net Amount</Label>
                    <Input type="number" value={netAmount || ""} onChange={(e) => setNetAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <Separator />
                </>
              )}

              {billType === "final" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Preauth</Label>
                      <Input type="number" value={preauthAmount || ""} onChange={(e) => setPreauthAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Enhancement</Label>
                      <Input type="number" value={enhancementApproved || ""} onChange={(e) => setEnhancementApproved(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Total Approved</Label>
                      <Input type="number" value={totalApproved || ""} onChange={(e) => setTotalApproved(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Settled</Label>
                      <Input type="number" value={finalSettled || ""} onChange={(e) => setFinalSettled(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Deductions</Label>
                      <Input type="number" value={deductions || ""} onChange={(e) => setDeductions(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Patient Payable</Label>
                      <Input type="number" value={patientPayable || ""} onChange={(e) => setPatientPayable(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                </>
              )}

              {billType === "enhancement" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Preauth Amount</Label>
                      <Input type="number" value={preauthAmount || ""} onChange={(e) => setPreauthAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Total Bill</Label>
                      <Input type="number" value={netAmount || ""} onChange={(e) => setNetAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Amt. to be Paid by Patient</Label>
                      <Input type="number" value={excessAmount || ""} onChange={(e) => setExcessAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Enhancement Requested</Label>
                      <Input type="number" value={enhancementAmount || ""} onChange={(e) => setEnhancementAmount(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                </>
              )}

              {billType === "cash" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Total Approved</Label>
                      <Input type="number" value={totalApproved || ""} onChange={(e) => setTotalApproved(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Settled</Label>
                      <Input type="number" value={finalSettled || ""} onChange={(e) => setFinalSettled(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Patient Payable</Label>
                      <Input type="number" value={patientPayable || ""} onChange={(e) => setPatientPayable(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Amt. Received</Label>
                      <Input type="number" value={amountReceived || ""} onChange={(e) => setAmountReceived(Number(e.target.value) || 0)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Balance</Label>
                    <Input type="number" value={patientBalance || ""} onChange={(e) => setPatientBalance(Number(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Live preview */}
        <div className="col-span-2">
          <div className="border border-border rounded-xl bg-gray-50 p-4 overflow-auto">
            <div
              ref={printRef}
              className="origin-top-left"
              style={{ transform: "scale(0.72)", transformOrigin: "top left", width: "138.9%" }}
            >
              {billType === "final" && (
                <InsuranceFinalBill
                  patientData={patientData}
                  billDate={billDate ? new Date(billDate + "T00:00:00").toISOString() : ""}
                  billingItems={validItems}
                  billingData={{ totalAmount, discountAmount, netAmount }}
                  insuranceData={{
                    companyName: claim.insuranceCompanyName,
                    preauthAmount,
                    enhancementApproved,
                    totalApproved,
                    finalSettled,
                    deductions,
                    patientPayable,
                  }}
                  headerHeight={headerHeight}
                />
              )}

              {billType === "enhancement" && (
                <InsuranceEnhancementBill
                  patientData={patientData}
                  billDate={billDate ? new Date(billDate + "T00:00:00").toISOString() : ""}
                  billingItems={validItems}
                  enhancementData={{
                    companyName: claim.insuranceCompanyName,
                    preauthAmount,
                    totalBillAmount: netAmount,
                    excessAmount,
                    enhancementRequested: enhancementAmount,
                  }}
                  headerHeight={headerHeight}
                />
              )}

              {billType === "cash" && (
                <InsuranceCashReceipt
                  patientData={{
                    billNumber: claim.claimNumber,
                    patientId: claim.ipNumber,
                    date: billDate ? format(new Date(billDate + "T00:00:00"), "dd/MM/yyyy") : "",
                    patientName: claim.patientName,
                    gender: claim.gender,
                    guardianName: claim.guardianName ?? "",
                    age: String(claim.age),
                    address: "",
                    mobile: claim.phone,
                    doctorName: doctors[0] ?? "—",
                    doctorNames: doctors.join(", "),
                    onDutyDoctor: "",
                    department: claim.department ?? "—",
                    dateOfAdmit: claim.admissionDate ? format(new Date(claim.admissionDate), "dd/MM/yyyy") : "",
                    dateOfDischarge: claim.dischargeDate ? format(new Date(claim.dischargeDate), "dd/MM/yyyy") : "",
                    referredBy: "",
                  }}
                  billingItems={validItems}
                  billingData={{
                    totalAmount,
                    advancePaid: 0,
                    discountPercent: totalAmount > 0 ? (discountAmount / totalAmount) * 100 : 0,
                    discountAmount,
                    amountReceived,
                    balance: patientBalance,
                  }}
                  insuranceSummary={{
                    companyName: claim.insuranceCompanyName,
                    totalApproved,
                    finalSettled,
                    patientPayable,
                    patientPaid: amountReceived,
                    patientBalance,
                  }}
                  headerHeight={headerHeight}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
