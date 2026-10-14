/**
 * analytics/revenue-tab.tsx
 *
 * Revenue & Finance tab — mirrors old app's RevenueTab.tsx.
 * Endpoints: financial-summary, expense-breakdown, time-series, revenue-by-category, payment-mode-breakdown
 *
 * Charts used (matching old app):
 *   - Revenue vs Expenses trend → ThemedAreaChart (multi-series)
 *   - Revenue by department → ThemedDonutChart
 *   - Payment mode breakdown → ThemedDonutChart
 *   - Expense breakdown → ThemedDonutChart
 *   - Discount breakdown → horizontal bar rows (custom div, matching old app)
 *   - Daily ledger → HTML table (matching old app)
 */

import { useState } from "react"
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Download,
} from "lucide-react"
import {
  StatCard,
  ChartContainer,
  ThemedAreaChart,
  ThemedDonutChart,
  ErrorState,
  EmptyState,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { Card, CardContent } from "@/components/ui/card"
import {
  useFinancialSummary,
  useExpenseBreakdown,
  useTimeSeries,
  useRevenueByCategory,
  usePaymentModeBreakdown,
} from "./hooks"
import type { TimeFilter, DailyFinancial } from "./types"

// ─── Colors (verified from analytics-shared.tsx) ──────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  Consultations: "#3b82f6",
  Labs:          "#14b8a6",
  Pharmacy:      "#10b981",
  Optical:       "#8b5cf6",
  "In-Patient":  "#f59e0b",
}

const PAYMENT_COLORS: Record<string, string> = {
  Cash:         "#4f46e5",
  UPI:          "#818cf8",
  Card:         "#a5b4fc",
  "Cheque/NEFT": "#c7d2fe",
  Insurance:    "#e0e7ff",
  Others:       "#f1f5f9",
}

const INDIGO = ["#4f46e5", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"]

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
]

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)

const fmtShort = (n: number) => {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

// ─── PDF Ledger Download (matching old RevenueTab.tsx pattern) ────────────────

function downloadLedgerPdf(daily: DailyFinancial[]) {
  const date = new Date().toISOString().slice(0, 10)
  const rows = daily
    .map((d) => {
      const net = d.collected - d.expenses
      const netColor = net >= 0 ? "#059669" : "#dc2626"
      return `<tr>
        <td>${d.date}</td>
        <td class="num">${fmt(d.billed)}</td>
        <td class="num green">${fmt(d.collected)}</td>
        <td class="num red">${fmt(d.expenses)}</td>
        <td class="num amber">${fmt(d.discount)}</td>
        <td class="num amber">${fmt(d.dues)}</td>
        <td class="num bold" style="color:${netColor}">${fmt(net)}</td>
      </tr>`
    })
    .join("")

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Daily Ledger — ${date}</title>
<style>* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, Arial, sans-serif; font-size: 12px; color: #0f172a; padding: 32px; }
h1 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
.sub { font-size: 11px; color: #64748b; margin-bottom: 24px; }
table { width: 100%; border-collapse: collapse; }
th { padding: 8px 12px; text-align: right; font-size: 10px; font-weight: 700; text-transform: uppercase;
     letter-spacing: 0.06em; color: #64748b; background: #f8fafc; border-bottom: 2px solid #e2e8f0; }
th:first-child { text-align: left; }
td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
td.num { text-align: right; font-variant-numeric: tabular-nums; }
td.green { color: #059669; font-weight: 600; } td.red { color: #dc2626; }
td.amber { color: #d97706; } td.bold { font-weight: 700; }
tr:nth-child(even) { background: #fafafa; }
</style></head><body>
<h1>Daily Ledger</h1><p class="sub">Generated on ${date} · All amounts in ₹</p>
<table><thead><tr><th>Date</th><th>Billed</th><th>Collected</th><th>Expenses</th><th>Discount</th><th>Dues</th><th>Net</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload = () => { window.print(); }<\/script></body></html>`

  const win = window.open("", "_blank")
  if (!win) return
  win.document.write(html)
  win.document.close()
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  filter: TimeFilter
  customStart?: string
  customEnd?: string
}

// ─── RevenueTab ───────────────────────────────────────────────────────────────

export function RevenueTab({ filter, customStart, customEnd }: Props) {
  const financialQ   = useFinancialSummary(filter, customStart, customEnd)
  const expenseQ     = useExpenseBreakdown(filter, customStart, customEnd)
  const timeSeriesQ  = useTimeSeries(filter, customStart, customEnd)
  const revCatQ      = useRevenueByCategory(filter, customStart, customEnd)
  const paymentModeQ = usePaymentModeBreakdown(filter, customStart, customEnd)

  const [ledgerExpanded, setLedgerExpanded] = useState(false)

  const financial   = financialQ.data
  const expenses    = expenseQ.data ?? []
  const timeSeries  = timeSeriesQ.data ?? []
  const revByCategory = revCatQ.data ?? []
  const paymentModes  = paymentModeQ.data ?? []

  if (financialQ.error && !financialQ.isLoading) {
    return (
      <ErrorState
        title="Could not load financial data"
        error={financialQ.error}
        onRetry={() => void financialQ.refetch()}
      />
    )
  }

  // Derived
  const collectionRate = financial && financial.totalBilled > 0
    ? Math.round((financial.totalCollected / financial.totalBilled) * 100)
    : 0

  // Revenue by category donut slices
  const revSlices: DonutChartSlice[] = revByCategory
    .filter((r) => r.amount > 0)
    .map((r) => ({
      name: r.category,
      value: r.amount,
      color: SOURCE_COLORS[r.category] ?? CHART_COLORS[0],
    }))

  // Expense breakdown donut slices
  const expSlices: DonutChartSlice[] = expenses
    .filter((e) => e.amount > 0)
    .map((e, i) => ({
      name: e.category,
      value: e.amount,
      color: INDIGO[i % INDIGO.length],
    }))

  // Payment mode donut slices
  const pmSlices: DonutChartSlice[] = paymentModes.map((p) => ({
    name: p.mode,
    value: p.amount,
    color: PAYMENT_COLORS[p.mode] ?? INDIGO[4],
  }))

  // Time series for multi-series area chart (collected vs expenses)
  const trendData = timeSeries.map((p) => ({
    date:      p.date,
    Collected: p.collected,
    Expenses:  p.expenses,
  }))

  // Discount module breakdown
  const discountByModule = financial?.discountByModule
  const discModules = discountByModule
    ? [
        { label: "Consultations", value: discountByModule.consultations },
        { label: "Labs",          value: discountByModule.labs          },
        { label: "Pharmacy",      value: discountByModule.pharmacy      },
        { label: "Optical",       value: discountByModule.optical       },
        { label: "In-Patient",    value: discountByModule.inpatient     },
      ]
    : []
  const maxDisc = Math.max(...discModules.map((m) => m.value), 1)

  return (
    <div className="space-y-5">

      {/* ROW 1 — 4 KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Cash Flow"
          value={financial ? fmt(financial.netCashFlow) : "—"}
          icon={
            (financial?.netCashFlow ?? 0) >= 0
              ? <TrendingUp size={20} aria-hidden="true" />
              : <TrendingDown size={20} aria-hidden="true" />
          }
          loading={financialQ.isLoading}
          subtitle="Collected minus expenses"
        />
        <StatCard
          label="Total Billed"
          value={financial ? fmt(financial.totalBilled) : "—"}
          icon={<Receipt size={20} aria-hidden="true" />}
          loading={financialQ.isLoading}
          subtitle="Across all departments"
        />
        <StatCard
          label="Collection Rate"
          value={financial ? `${collectionRate}%` : "—"}
          icon={<CreditCard size={20} aria-hidden="true" />}
          loading={financialQ.isLoading}
          subtitle={financial ? `${fmt(financial.totalCollected)} of ${fmt(financial.totalBilled)}` : undefined}
          progress={financial ? collectionRate : undefined}
        />
        <StatCard
          label="Pending Dues"
          value={financial ? fmt(financial.totalDues) : "—"}
          icon={<IndianRupee size={20} aria-hidden="true" />}
          loading={financialQ.isLoading}
          subtitle="Outstanding balance"
        />
      </div>

      {/* ROW 2 — Revenue vs Expenses trend + Revenue by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartContainer
          title="Revenue vs Expenses Trend"
          description="Daily collected amount vs operational expenses"
          loading={timeSeriesQ.isLoading}
          empty={!timeSeriesQ.isLoading && trendData.length === 0}
          emptyMessage="No trend data for this period."
          height={220}
        >
          <ThemedAreaChart
            data={trendData}
            series={[
              { dataKey: "Collected", name: "Collected", color: "#4f46e5" },
              { dataKey: "Expenses",  name: "Expenses",  color: "#ef4444" },
            ]}
            xAxisKey="date"
            xTickFormatter={(v) => String(v).slice(5)}
            yTickFormatter={(v) => fmtShort(Number(v))}
            height={220}
            fillOpacity={0.1}
          />
        </ChartContainer>

        <ChartContainer
          title="Revenue by Department"
          description="Billed amount per module"
          loading={revCatQ.isLoading}
          empty={!revCatQ.isLoading && revSlices.length === 0}
          emptyMessage="No revenue by category data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={revSlices}
            totalLabel="Revenue"
            height={220}
          />
        </ChartContainer>
      </div>

      {/* ROW 3 — Payment Mode + Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartContainer
          title="Payment Mode Breakdown"
          description="Collected by payment method"
          loading={paymentModeQ.isLoading}
          empty={!paymentModeQ.isLoading && pmSlices.length === 0}
          emptyMessage="No payment mode data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={pmSlices}
            height={220}
          />
        </ChartContainer>

        <ChartContainer
          title="Expense Breakdown"
          description="Operational costs by category"
          loading={expenseQ.isLoading}
          empty={!expenseQ.isLoading && expSlices.length === 0}
          emptyMessage="No expense data for this period."
          height={220}
        >
          <ThemedDonutChart
            data={expSlices}
            height={220}
          />
        </ChartContainer>
      </div>

      {/* ROW 4 — Discount Breakdown (horizontal bar rows) */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Discount Breakdown</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Concessions given per department</p>
            </div>
            {financial && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total</p>
                <p className="text-xl font-black text-amber-600 tabular-nums mt-0.5">
                  {fmt(financial.totalDiscount)}
                </p>
              </div>
            )}
          </div>
          {financialQ.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : financial && financial.totalDiscount > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
              {discModules.map((m) => (
                <div key={m.label} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
                  <span className="text-xs font-medium text-foreground w-24 shrink-0">{m.label}</span>
                  <div className="flex-1 h-2 bg-amber-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                      style={{ width: `${Math.round((m.value / maxDisc) * 100)}%` }}
                      aria-label={`${m.label}: ${fmt(m.value)}`}
                    />
                  </div>
                  <span className="text-xs font-semibold text-amber-600 tabular-nums w-16 text-right shrink-0">
                    {fmt(m.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No discounts" description="No discounts recorded for this period." />
          )}
        </CardContent>
      </Card>

      {/* ROW 5 — Daily Ledger table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Daily Ledger</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Day-by-day breakdown · most recent first</p>
          </div>
          {financial && financial.dailyBreakdown.length > 0 && (
            <button
              onClick={() => downloadLedgerPdf(financial.dailyBreakdown)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/60 hover:bg-muted border border-border/50 rounded-lg text-xs font-semibold text-foreground transition-colors"
              aria-label="Download daily ledger as PDF"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download PDF
            </button>
          )}
        </div>

        {financialQ.isLoading ? (
          <div className="p-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/10">
                  {["Date", "Billed", "Collected", "Expenses", "Discount", "Dues", "Net"].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {financial && financial.dailyBreakdown.length > 0 ? (
                  (ledgerExpanded
                    ? financial.dailyBreakdown
                    : financial.dailyBreakdown.slice(0, 10)
                  ).map((day) => {
                    const net = day.collected - day.expenses
                    return (
                      <tr key={day.date} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-foreground tabular-nums">{day.date}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(day.billed)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600 font-medium tabular-nums">{fmt(day.collected)}</td>
                        <td className="px-4 py-2.5 text-right text-red-500 tabular-nums">{fmt(day.expenses)}</td>
                        <td className="px-4 py-2.5 text-right text-amber-500 tabular-nums">{fmt(day.discount)}</td>
                        <td className="px-4 py-2.5 text-right text-amber-600 tabular-nums">{fmt(day.dues)}</td>
                        <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {fmt(net)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                      No data for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {financial && financial.dailyBreakdown.length > 10 && (
          <div className="border-t border-border/40 px-5 py-3 flex items-center justify-center">
            <button
              onClick={() => setLedgerExpanded((e) => !e)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              aria-label={ledgerExpanded ? "Show fewer ledger rows" : `Show all ${financial.dailyBreakdown.length} ledger rows`}
            >
              {ledgerExpanded
                ? "Show less"
                : `Show all ${financial.dailyBreakdown.length} rows`}
            </button>
          </div>
        )}
      </Card>

    </div>
  )
}
