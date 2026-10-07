/**
 * ExpensesSection — main content area for the Expenses page.
 *
 * Layout matches src/app/(hospital)/expenses/components/ExpensesPage.tsx:
 *   Left column (lg:col-span-1): donut chart by category + total card.
 *   Right column (lg:col-span-2): expense list with search, category filter, sort.
 *
 * Time filters: today | this week | this month | custom (native date inputs).
 * The old app does NOT use DateRangePicker — matches that pattern exactly.
 *
 * Expense list: custom card list (not DataTable) with edit/delete per row.
 *
 * Permissions (passed from parent — see ExpensesPage.tsx):
 *   canEdit   — show edit button per row (expenses:edit)
 *   canDelete — show delete button per row (expenses:delete)
 */

import { useState, useMemo } from "react"
import { Search, Pencil, Trash2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartContainer,
  ThemedDonutChart,
  ErrorState,
  EmptyState,
  SegmentedControl,
} from "@/components/patterns"
import type { DonutChartSlice } from "@/components/patterns"
import { formatCurrency } from "@/lib/utils"
import { useExpenses, useCategories, getDateRange } from "./hooks"
import type { ExpenseWithCategory, TimeFilter } from "./types"
import { TIME_FILTER_OPTIONS } from "./types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmountShort(amount: number): string {
  if (amount >= 1_000_000) return `₹${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`
  return `₹${amount}`
}

function formatExpenseDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate))
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ExpensesSectionProps {
  canEdit: boolean
  canDelete: boolean
  /** Called when user clicks the edit button on an expense row. */
  onEdit: (expense: ExpenseWithCategory) => void
  /** Called when user clicks the delete button on an expense row. */
  onDelete: (expense: ExpenseWithCategory) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpensesSection({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ExpensesSectionProps) {
  // ── Filter state ─────────────────────────────────────────────────────────

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest")

  // Only apply custom range when both dates are provided
  const customRangeReady =
    timeFilter === "custom" ? customStart !== "" && customEnd !== "" : true

  const { startDate, endDate } = getDateRange(timeFilter, customStart, customEnd)

  // ── Data ─────────────────────────────────────────────────────────────────

  const { data: categories = [] } = useCategories()

  const {
    data: expenses = [],
    isLoading,
    error,
    refetch,
  } = useExpenses(startDate, endDate, customRangeReady)

  // ── Derived data ─────────────────────────────────────────────────────────

  const filteredExpenses = useMemo(() => {
    return [...expenses]
      .filter((expense) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const inTitle = expense.title.toLowerCase().includes(q)
          const inCategory = expense.category.name.toLowerCase().includes(q)
          const inReason = (expense.reason?.toLowerCase().includes(q)) ?? false
          if (!inTitle && !inCategory && !inReason) return false
        }
        if (categoryFilter !== "all" && expense.category.name !== categoryFilter) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.date).getTime() - new Date(a.date).getTime()
        if (sortBy === "highest") return b.amount - a.amount
        return a.amount - b.amount
      })
  }, [expenses, searchQuery, categoryFilter, sortBy])

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const chartData = useMemo<DonutChartSlice[]>(() => {
    const map = new Map<string, { name: string; amount: number; color: string }>()
    for (const expense of filteredExpenses) {
      const existing = map.get(expense.category.name)
      if (existing) {
        existing.amount += expense.amount
      } else {
        map.set(expense.category.name, {
          name: expense.category.name,
          amount: expense.amount,
          color: expense.category.color,
        })
      }
    }
    return Array.from(map.values())
      .filter((c) => c.amount > 0)
      .map((c) => ({ name: c.name, value: c.amount, color: c.color }))
  }, [filteredExpenses])

  const timeFilterLabel =
    TIME_FILTER_OPTIONS.find((f) => f.value === timeFilter)?.label ?? ""

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Time filter bar — plain bordered card, not the sticky PageToolbar/
          FilterBar; matches main's exact treatment for this page. */}
      <div className="rounded-xl border border-border/60 bg-white shadow-sm px-4 py-3 flex flex-wrap gap-2 items-center">
        <SegmentedControl
          options={TIME_FILTER_OPTIONS}
          value={timeFilter}
          onValueChange={setTimeFilter}
          aria-label="Time period filter"
        />

        {timeFilter === "custom" && (
          <div className="flex gap-2 items-center ml-1">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-[145px] h-8 text-sm"
              aria-label="Start date"
            />
            <span className="text-[length:var(--text-caption)] text-[var(--color-muted-foreground)]">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-[145px] h-8 text-sm"
              aria-label="End date"
            />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <ErrorState
          title="Could not load expenses"
          error={error}
          onRetry={() => void refetch()}
        />
      )}

      {/* Main grid: chart (left) + list (right) */}
      {!error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column: chart + total */}
          <div className="lg:col-span-1 space-y-5">
            {/* Chart card */}
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground">Expense Summary</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{timeFilterLabel}</p>
              </div>
              <div className="p-5">
                <ChartContainer
                  loading={isLoading}
                  empty={!isLoading && chartData.length === 0}
                  emptyMessage="No expenses in this period."
                  height={256}
                >
                  <ThemedDonutChart
                    data={chartData}
                    totalLabel="Total Spent"
                    totalValue={formatAmountShort(totalAmount)}
                    innerRadius="60%"
                    outerRadius="88%"
                    height={256}
                  />
                </ChartContainer>

                {/* Category breakdown */}
                {!isLoading && chartData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                    {chartData.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                            aria-hidden="true"
                          />
                          <span className="text-sm text-foreground">{cat.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {isLoading && (
                  <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-2.5 w-2.5 rounded-full" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/4 ml-auto" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Total card */}
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground">Total Expenses</h2>
              </div>
              <div className="px-5 py-4">
                {isLoading ? (
                  <Skeleton className="h-8 w-2/3" />
                ) : (
                  <div className="text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(totalAmount)}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{timeFilterLabel}</p>
              </div>
            </div>
          </div>

          {/* Right column: expense list */}
          <div className="lg:col-span-2">
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
              {/* List header with filters */}
              <div className="px-5 py-3.5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Expense List</h2>

                <div className="flex flex-wrap gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search
                      className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <Input
                      type="text"
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm w-[160px]"
                      aria-label="Search expenses"
                    />
                  </div>

                  {/* Category filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 text-sm w-[150px]" aria-label="Filter by category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select
                    value={sortBy}
                    onValueChange={(v) =>
                      setSortBy(v as "newest" | "highest" | "lowest")
                    }
                  >
                    <SelectTrigger className="h-8 text-sm w-[140px]" aria-label="Sort expenses">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="highest">Highest Amount</SelectItem>
                      <SelectItem value="lowest">Lowest Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* List body */}
              <div className="divide-y divide-border/40" role="list" aria-label="Expense list">
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3.5">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5 w-3/4">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                        <Skeleton className="h-5 w-1/6" />
                      </div>
                    </div>
                  ))}

                {!isLoading && filteredExpenses.length === 0 && (
                  <div className="py-16">
                    <EmptyState
                      title="No expenses found"
                      description="Try adjusting your filters or date range."
                    />
                  </div>
                )}

                {!isLoading &&
                  filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                      role="listitem"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {expense.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatExpenseDate(expense.date)}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white shrink-0"
                              style={{ backgroundColor: expense.category.color }}
                            >
                              {expense.category.name}
                            </span>
                            {expense.paymentMode && (
                              <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                {expense.paymentMode}
                              </span>
                            )}
                          </div>
                          {expense.reason && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {expense.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(expense.amount)}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(expense)}
                              className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                              aria-label={`Edit ${expense.title}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(expense)}
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                              aria-label={`Delete ${expense.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Footer summary */}
              {!isLoading && filteredExpenses.length > 0 && (
                <div className="px-5 py-2.5 border-t border-border/40 bg-muted/20 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {filteredExpenses.length} expense
                    {filteredExpenses.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
