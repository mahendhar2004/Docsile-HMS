/**
 * lab-records-tab.tsx
 *
 * Patient lab records — expandable accordion with test items and payments.
 * Tab ID: "labs"
 * Endpoint: GET /reports/patients/{patientId}/labs
 * Permission: reports:view (gated by parent)
 */

import { useState } from "react"
import {
  FlaskConical,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Printer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/patterns"
import { formatDateLong, formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/sonner"
import { usePatientLabRecords } from "./hooks"
import { LAB_STATUS_VARIANT } from "./types"

interface LabRecordsTabProps {
  /** Patient UUID — route param for GET /reports/patients/{id}/labs. */
  patientId: string
}

export function LabRecordsTab({ patientId }: LabRecordsTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: bills, isLoading, isError, error, refetch } =
    usePatientLabRecords(patientId)

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading lab records">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load lab records"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mx-auto mb-4">
          <FlaskConical className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground">No lab records</p>
        <p className="text-xs text-muted-foreground mt-1">
          No lab bills have been created for this patient
        </p>
      </div>
    )
  }

  const totalBilled = bills.reduce((s, b) => s + b.total, 0)
  const totalPaid = bills.reduce((s, b) => s + b.amountPaid, 0)

  return (
    <div className="space-y-3">
      {/* Quick summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
        <span>
          {bills.length} lab bill{bills.length !== 1 ? "s" : ""}
        </span>
        <span className="text-foreground font-medium">
          Total: {formatCurrency(totalBilled)}
        </span>
        <span className="text-emerald-600 font-medium">
          Paid: {formatCurrency(totalPaid)}
        </span>
        {totalBilled - totalPaid > 0 && (
          <span className="text-red-600 font-medium">
            Due: {formatCurrency(totalBilled - totalPaid)}
          </span>
        )}
      </div>

      {bills.map((bill) => {
        const expanded = expandedId === bill.id

        return (
          <div
            key={bill.id}
            className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
          >
            <button
              onClick={() => setExpandedId(expanded ? null : bill.id)}
              aria-expanded={expanded}
              aria-controls={`lab-detail-${bill.id}`}
              className="w-full px-5 py-4 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                  <FlaskConical className="h-4 w-4 text-orange-600" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {bill.lab.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                      {bill.billNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatDateLong(bill.createdAt)}</span>
                    <span>
                      {bill.items.length} test
                      {bill.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(bill.total)}
                    </span>
                    {bill.balanceDue > 0 && (
                      <p className="text-[10px] text-red-600 font-medium">
                        Due: {formatCurrency(bill.balanceDue)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={LAB_STATUS_VARIANT[bill.status] ?? "secondary"}
                    className="text-xs"
                  >
                    {bill.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Print lab bill"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      toast.info("Print functionality coming soon.")
                    }}
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
              </div>
            </button>

            {expanded && (
              <div id={`lab-detail-${bill.id}`} className="border-t border-gray-100 bg-gray-50/50">
                {/* Tests list */}
                <div className="px-5 py-3 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Tests Ordered
                  </h4>
                  <div className="space-y-1.5">
                    {bill.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">{item.name}</span>
                        <span className="text-muted-foreground font-medium">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payments */}
                {bill.payments.length > 0 && (
                  <div className="px-5 py-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Payments
                    </h4>
                    <div className="space-y-1.5">
                      {bill.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="text-foreground">
                              {formatDateLong(payment.paymentDate)}
                            </span>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-muted-foreground">
                              {payment.paymentMode}
                            </span>
                          </div>
                          <span className="text-emerald-600 font-medium">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary footer */}
                <div className="px-5 py-2.5 bg-gray-100/50 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Subtotal: {formatCurrency(bill.subtotal)}
                    {bill.discount > 0 &&
                      ` | Discount: ${formatCurrency(bill.discount)}`}
                  </span>
                  <span className="font-semibold text-foreground">
                    Total: {formatCurrency(bill.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
