/**
 * export-section.tsx
 *
 * Bulk data export UI. Matches the real old DataExportPage.tsx pattern:
 *   - Tab selection for 9 export types
 *   - Date range + search filters (auto-fetch with debounce on search)
 *   - Column visibility toggle
 *   - Row selection (individual + select-all)
 *   - Client-side CSV / Excel (.xls) blob download
 *
 * Permission: data:export (gated by parent ReportsPage)
 * Endpoints: GET /reports/exports/{endpoint}?filter=custom&customStart=...&customEnd=...&search=...
 * Rate limit: 10 req/min per user (API-enforced)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
  Calendar,
  Filter,
  ChevronDown,
  CheckSquare,
  Square,
  Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/sonner"
import { PageToolbar, SearchBar } from "@/components/patterns"
import { formatDate, formatCurrency } from "@/lib/utils"
import { useExportData } from "./hooks"
import {
  EXPORT_TAB_CONFIG,
  ALL_EXPORT_ENDPOINTS,
  type ExportEndpoint,
  type ExportRow,
  type ExportCellFormat,
} from "./types"

// ─── Eye reading formatters (matched exactly from DataExportPage.tsx) ─────────

function fmtEyeRow(r: Record<string, string> | null | undefined): string {
  if (!r) return "—"
  const parts: string[] = []
  if (r.sph) parts.push(r.sph)
  if (r.cyl) parts.push(r.cyl)
  if (r.axis) parts.push(`×${r.axis}`)
  if (r.va) parts.push(`VA:${r.va}`)
  if (r.vacph) parts.push(`(PH:${r.vacph})`)
  return parts.length ? parts.join(" ") : "—"
}

function formatEyeAR(value: unknown): string {
  try {
    const d =
      typeof value === "string"
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>)
    if (!d || typeof d !== "object") return ""
    const parts: string[] = []
    if (d.re) parts.push(`RE: ${fmtEyeRow(d.re as Record<string, string>)}`)
    if (d.le) parts.push(`LE: ${fmtEyeRow(d.le as Record<string, string>)}`)
    if (d.pd) parts.push(`PD: ${String(d.pd)}`)
    return parts.join("  |  ") || "—"
  } catch {
    return String(value)
  }
}

function formatEyeDN(value: unknown): string {
  try {
    const d =
      typeof value === "string"
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>)
    if (!d || typeof d !== "object") return ""
    const eye = (
      e: Record<string, Record<string, string>> | null,
      label: string,
    ) => {
      if (!e) return null
      const dist = fmtEyeRow(e.d)
      const near = fmtEyeRow(e.n)
      return `${label}: D: ${dist}  N: ${near}`
    }
    const parts = [
      eye(d.re as Record<string, Record<string, string>>, "RE"),
      eye(d.le as Record<string, Record<string, string>>, "LE"),
    ].filter(Boolean)
    return parts.join("  |  ") || "—"
  } catch {
    return String(value)
  }
}

function formatEyeCF(value: unknown): string {
  try {
    const d =
      typeof value === "string"
        ? (JSON.parse(value) as Record<string, unknown>)
        : (value as Record<string, unknown>)
    if (!d || typeof d !== "object") return ""
    const eye = (e: Record<string, string> | null, label: string) => {
      if (!e) return null
      const fields = Object.entries(e)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
        .join(", ")
      return fields ? `${label}: ${fields}` : null
    }
    const parts = [
      eye(d.re as Record<string, string>, "RE"),
      eye(d.le as Record<string, string>, "LE"),
    ].filter(Boolean)
    return parts.join("  |  ") || "—"
  } catch {
    return String(value)
  }
}

function formatCellValue(value: unknown, format?: ExportCellFormat): string {
  if (value === null || value === undefined || value === "") return ""
  if (format === "date") return formatDate(value as string)
  if (format === "currency") return formatCurrency(value as number)
  if (format === "eyeAR") return formatEyeAR(value)
  if (format === "eyeDN") return formatEyeDN(value)
  if (format === "eyeCF") return formatEyeCF(value)
  if (format === "json") {
    try {
      const parsed =
        typeof value === "string"
          ? (JSON.parse(value) as unknown)
          : value
      if (Array.isArray(parsed)) {
        return (parsed as Array<Record<string, unknown>>)
          .map((item) => String(item.name ?? JSON.stringify(item)))
          .join("; ")
      }
      if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed as Record<string, unknown>)
          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
          .join("; ")
      }
      return String(parsed)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatCellForExport(value: unknown, format?: ExportCellFormat): string {
  if (value === null || value === undefined || value === "") return ""
  if (format === "date") {
    const d = new Date(value as string)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleDateString("en-IN")
  }
  if (format === "currency") return String(value)
  if (format === "eyeAR") return formatEyeAR(value)
  if (format === "eyeDN") return formatEyeDN(value)
  if (format === "eyeCF") return formatEyeCF(value)
  if (format === "json") {
    try {
      const parsed =
        typeof value === "string"
          ? (JSON.parse(value) as unknown)
          : value
      if (Array.isArray(parsed)) {
        return (parsed as Array<Record<string, unknown>>)
          .map((item) => String(item.name ?? JSON.stringify(item)))
          .join("; ")
      }
      return typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportSection() {
  const [activeTab, setActiveTab] = useState<ExportEndpoint>("patients")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(EXPORT_TAB_CONFIG["patients"].columns.map((c) => c.key)),
  )
  const [exporting, setExporting] = useState(false)
  const [fetchEnabled, setFetchEnabled] = useState(false)

  const config = EXPORT_TAB_CONFIG[activeTab]
  const allColumnKeys = useMemo(() => config.columns.map((c) => c.key), [config])

  // Debounce search (400ms — matches DataExportPage.tsx)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [debouncedSearch, dateFrom, dateTo],
  )

  const {
    data: fetchedData,
    isLoading,
    isFetching,
  } = useExportData(activeTab, params, fetchEnabled)

  const data: ExportRow[] = fetchedData ?? []

  // Reset on tab change
  function handleTabChange(tab: ExportEndpoint) {
    setActiveTab(tab)
    setVisibleColumns(new Set(EXPORT_TAB_CONFIG[tab].columns.map((c) => c.key)))
    setSelectedIds(new Set())
    setSearch("")
    setDebouncedSearch("")
    setDateFrom("")
    setDateTo("")
    setFetchEnabled(false)
  }

  // Selection
  const allSelected = data.length > 0 && selectedIds.size === data.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.map((row) => row.id as string)))
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Column visibility
  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const visibleCols = config.columns.filter((c) => visibleColumns.has(c.key))

  // Export rows (selected or all)
  function getExportRows() {
    if (selectedIds.size > 0) {
      return data.filter((row) => selectedIds.has(row.id as string))
    }
    return data
  }

  const exportCSV = useCallback(() => {
    const rows = getExportRows()
    if (rows.length === 0) {
      toast.error("No data to export")
      return
    }
    setExporting(true)
    try {
      const headers = visibleCols.map((c) => c.label)
      const csvRows = [
        headers.map(escapeCsvField).join(","),
        ...rows.map((row) =>
          visibleCols
            .map((col) =>
              escapeCsvField(formatCellForExport(row[col.key], col.format)),
            )
            .join(","),
        ),
      ]
      const csvContent = "﻿" + csvRows.join("\n") // BOM for Excel UTF-8
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      downloadBlob(
        blob,
        `${config.label.toLowerCase().replace(/\s+/g, "-")}-export.csv`,
      )
      toast.success(`Exported ${rows.length} rows as CSV`)
    } catch {
      toast.error("Export failed")
    } finally {
      setExporting(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedIds, visibleCols, config])

  const exportExcel = useCallback(() => {
    const rows = getExportRows()
    if (rows.length === 0) {
      toast.error("No data to export")
      return
    }
    setExporting(true)
    try {
      const headerCells = visibleCols
        .map((c) => `<th>${escapeHtml(c.label)}</th>`)
        .join("")
      const bodyRows = rows
        .map((row) => {
          const cells = visibleCols
            .map((col) => {
              const val = formatCellForExport(row[col.key], col.format)
              return `<td>${escapeHtml(val)}</td>`
            })
            .join("")
          return `<tr>${cells}</tr>`
        })
        .join("")

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${config.label}</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>td,th{border:1px solid #ccc;padding:4px 8px;font-family:Calibri,sans-serif;font-size:11pt}th{background:#4472C4;color:white;font-weight:bold}</style>
        </head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>
      `
      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      })
      downloadBlob(
        blob,
        `${config.label.toLowerCase().replace(/\s+/g, "-")}-export.xls`,
      )
      toast.success(`Exported ${rows.length} rows as Excel`)
    } catch {
      toast.error("Export failed")
    } finally {
      setExporting(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedIds, visibleCols, config])

  const hasFilters = search || dateFrom || dateTo
  function clearFilters() {
    setSearch("")
    setDebouncedSearch("")
    setDateFrom("")
    setDateTo("")
  }

  const loading = isLoading || isFetching

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Data Export</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select, filter, and export hospital data as CSV or Excel
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedIds.size} selected
            </Badge>
          )}
          {fetchEnabled && (
            <Badge variant="outline" className="text-xs">
              {data.length} records
            </Badge>
          )}
        </div>
      </div>

      {/* Export type tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as ExportEndpoint)}
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto flex-wrap gap-1">
            {ALL_EXPORT_ENDPOINTS.map((endpoint) => (
              <TabsTrigger
                key={endpoint}
                value={endpoint}
                className="text-xs px-3 py-1.5"
              >
                {EXPORT_TAB_CONFIG[endpoint].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Filters bar */}
      <PageToolbar>
        {/* Search */}
        <SearchBar
          variant="standalone"
          value={search}
          onChange={setSearch}
          placeholder={`Search ${config.label.toLowerCase()}...`}
          aria-label={`Search ${config.label.toLowerCase()}`}
          className="flex-1 min-w-[200px] max-w-[320px]"
        />

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <Calendar
            className="h-4 w-4 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[140px] text-sm"
            aria-label="Date from"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[140px] text-sm"
            aria-label="Date to"
          />
        </div>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-xs"
          >
            <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Clear
          </Button>
        )}

        {/* Fetch button */}
        <Button
          size="sm"
          variant="outline"
          className="h-9 text-xs"
          onClick={() => setFetchEnabled(true)}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" aria-hidden="true" />
          ) : null}
          {fetchEnabled ? "Refresh" : "Fetch Data"}
        </Button>

        <div className="flex-1" />

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Columns ({visibleCols.length}/{config.columns.length})
              <ChevronDown className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex gap-1 px-2 pb-1">
              <button
                onClick={() => setVisibleColumns(new Set(allColumnKeys))}
                className="text-[0.7rem] text-primary hover:underline"
                type="button"
              >
                All
              </button>
              <span className="text-muted-foreground text-[0.7rem]">|</span>
              <button
                onClick={() =>
                  setVisibleColumns(new Set([allColumnKeys[0]]))
                }
                className="text-[0.7rem] text-primary hover:underline"
                type="button"
              >
                None
              </button>
            </div>
            <DropdownMenuSeparator />
            {config.columns.map((col) => (
              <DropdownMenuItem
                key={col.key}
                onSelect={(e) => e.preventDefault()}
                onClick={() => toggleColumn(col.key)}
                className="text-xs gap-2"
              >
                <Checkbox
                  checked={visibleColumns.has(col.key)}
                  className="h-3.5 w-3.5"
                  aria-label={`Toggle ${col.label} column`}
                />
                {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export dropdown */}
        {fetchEnabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-9 text-xs"
                disabled={data.length === 0 || exporting || loading}
              >
                {exporting ? (
                  <Loader2
                    className="h-3.5 w-3.5 mr-1.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                )}
                Export{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                <ChevronDown className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">
                {selectedIds.size > 0
                  ? `Export ${selectedIds.size} selected rows`
                  : `Export all ${data.length} rows`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV} className="text-xs gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel} className="text-xs gap-2">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                Export as Excel (.xls)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </PageToolbar>

      {/* Data table */}
      <div className="border rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="w-[44px] px-3">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    aria-label={allSelected ? "Deselect all" : "Select all"}
                    className="flex items-center justify-center"
                  >
                    {allSelected ? (
                      <CheckSquare
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                    ) : someSelected ? (
                      <Minus
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                    ) : (
                      <Square
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-[50px] px-3 text-xs">#</TableHead>
                {visibleCols.map((col) => (
                  <TableHead key={col.key} className="text-xs whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!fetchEnabled ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleCols.length + 2}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileText
                        className="h-8 w-8 text-muted-foreground/50"
                        aria-hidden="true"
                      />
                      <p className="text-sm">
                        Click &ldquo;Fetch Data&rdquo; to load records
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-3">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="px-3">
                      <Skeleton className="h-4 w-6" />
                    </TableCell>
                    {visibleCols.map((col) => (
                      <TableCell key={col.key}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleCols.length + 2}
                    className="text-center py-16 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileText
                        className="h-8 w-8 text-muted-foreground/50"
                        aria-hidden="true"
                      />
                      <p className="text-sm">
                        No {config.label.toLowerCase()} found
                      </p>
                      {hasFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs mt-1"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, idx) => {
                  const id = row.id as string
                  const isSelected = selectedIds.has(id)
                  return (
                    <TableRow
                      key={id ?? idx}
                      data-state={isSelected ? "selected" : undefined}
                      className={isSelected ? "bg-primary/5" : ""}
                    >
                      <TableCell className="px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(id)}
                          aria-label={isSelected ? "Deselect row" : "Select row"}
                          className="flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare
                              className="h-4 w-4 text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <Square
                              className="h-4 w-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      {visibleCols.map((col) => (
                        <TableCell
                          key={col.key}
                          className="text-xs whitespace-nowrap max-w-[250px] truncate"
                          title={formatCellValue(row[col.key], col.format)}
                        >
                          {formatCellValue(row[col.key], col.format)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        {fetchEnabled && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/30 text-xs text-muted-foreground">
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${data.length} row(s) selected`
                : `${data.length} row(s) total`}
            </span>
            <span>
              Showing {visibleCols.length} of {config.columns.length} columns
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
