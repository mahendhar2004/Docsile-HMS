/**
 * StockTab — stock view/management with summary cards and add/edit dialogs.
 * Permissions:
 *   - View stock: pharmacy:view
 *   - Add stock / edit stock: pharmacy:manage_stock
 */

import { useState } from "react"
import { Plus, MoreHorizontal, Pencil } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  StatCard,
  DataTable,
  EmptyState,
  ErrorState,
  SearchBar,
  SegmentedControl,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/hooks/usePermissions"
import {
  useStock,
  useStockSummary,
  useAddStock,
  useUpdateStock,
  useMedicines,
  useSuppliers,
} from "./hooks"
import type { PharmacyStockItem } from "./types"
import { StockForm } from "./stock-form"
import { Package, AlertTriangle, Calendar, IndianRupee } from "lucide-react"

type StockFilter = "all" | "lowStock" | "nearExpiry"

const STOCK_FILTER_OPTIONS = [
  { value: "all" as const, label: "All" },
  { value: "lowStock" as const, label: "Low Stock" },
  { value: "nearExpiry" as const, label: "Near Expiry" },
]

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function isNearExpiry(dateStr: string): boolean {
  const d = new Date(dateStr)
  const threeMonths = new Date()
  threeMonths.setMonth(threeMonths.getMonth() + 3)
  return d <= threeMonths
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) <= new Date()
}

export function StockTab() {
  const { can } = usePermissions()
  const canManage = can("pharmacy:manage_stock")

  const { data: stock, isLoading: stockLoading, error: stockError, refetch } = useStock()
  const { data: summary, isLoading: summaryLoading } = useStockSummary()
  const { data: medicines } = useMedicines()
  const { data: suppliers } = useSuppliers()
  const addStock = useAddStock()
  const updateStock = useUpdateStock()

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<StockFilter>("all")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingStock, setEditingStock] = useState<PharmacyStockItem | null>(null)

  const filtered = (stock ?? []).filter((item) => {
    // filter chip
    if (filter === "lowStock" && item.quantity > 10) return false
    if (filter === "nearExpiry" && !isNearExpiry(item.expiryDate)) return false
    // search
    if (search) {
      const q = search.toLowerCase()
      const matches =
        item.medicine.name.toLowerCase().includes(q) ||
        item.batchNumber.toLowerCase().includes(q) ||
        (item.medicine.manufacturer?.toLowerCase().includes(q) ?? false)
      if (!matches) return false
    }
    return true
  })

  const columns: ColumnDef<PharmacyStockItem>[] = [
    {
      key: "medicine",
      header: "Medicine",
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.medicine.name}</p>
          {row.medicine.genericName && (
            <p className="text-xs text-muted-foreground">{row.medicine.genericName}</p>
          )}
          {row.medicine.manufacturer && (
            <p className="text-xs text-muted-foreground">{row.medicine.manufacturer}</p>
          )}
        </div>
      ),
    },
    {
      key: "batchNumber",
      header: "Batch",
      cell: (row) => (
        <span className="font-mono text-xs">{row.batchNumber}</span>
      ),
    },
    {
      key: "unitsPerPack",
      header: "Packing",
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {row.unitsPerPack}&apos;s
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Qty (units)",
      align: "right",
      cell: (row) => (
        <div className="text-right">
          <span
            className={`text-xs font-medium ${
              row.quantity <= 10 ? "text-red-600 font-semibold" : ""
            }`}
          >
            {row.quantity}
          </span>
          {row.quantity <= 10 && (
            <Badge variant="error" className="text-[9px] px-1 py-0 mt-0.5 block">
              Low
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "mrp",
      header: "MRP / Unit",
      align: "right",
      cell: (row) => (
        <span className="text-xs">
          {formatINR(row.mrp)}
        </span>
      ),
    },
    {
      key: "costPrice",
      header: "Cost / Unit",
      align: "right",
      cell: (row) => (
        <span className="text-xs">
          {formatINR(row.costPrice)}
        </span>
      ),
    },
    {
      key: "gstPercent",
      header: "GST %",
      align: "center",
      cell: (row) => (
        <span className="text-xs">{row.gstPercent}%</span>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry",
      cell: (row) => (
        <span
          className={
            isExpired(row.expiryDate)
              ? "text-red-600 font-semibold text-xs"
              : isNearExpiry(row.expiryDate)
              ? "text-amber-600 font-medium text-xs"
              : "text-xs"
          }
        >
          {formatDate(row.expiryDate)}
          {isExpired(row.expiryDate) && (
            <Badge variant="error" className="ml-1.5 text-[10px] px-1 py-0">
              Expired
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (row) => (
        <span className="text-xs font-medium">
          {formatINR(row.quantity * row.mrp)}
        </span>
      ),
    },
  ]

  if (canManage) {
    columns.push({
      key: "actions",
      header: "",
      align: "center",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label={`Actions for ${row.medicine.name}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditingStock(row)}>
              <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  if (stockError) {
    return (
      <ErrorState
        title="Could not load stock"
        error={stockError}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Stock Items"
          value={summaryLoading ? "—" : String(summary?.totalItems ?? 0)}
          icon={<Package size={20} aria-hidden="true" />}
          loading={summaryLoading}
        />
        <StatCard
          label="Low Stock"
          value={summaryLoading ? "—" : String(summary?.lowStock ?? 0)}
          icon={<AlertTriangle size={20} aria-hidden="true" />}
          loading={summaryLoading}
        />
        <StatCard
          label="Near Expiry"
          value={summaryLoading ? "—" : String(summary?.nearExpiry ?? 0)}
          icon={<Calendar size={20} aria-hidden="true" />}
          loading={summaryLoading}
        />
        <StatCard
          label="Stock Value"
          value={summaryLoading ? "—" : formatINR(summary?.stockValue ?? 0)}
          icon={<IndianRupee size={20} aria-hidden="true" />}
          loading={summaryLoading}
        />
      </div>

      {/* Toolbar — plain flex row, matches main's exact Stock tab search & actions row. */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          variant="standalone"
          value={search}
          onChange={setSearch}
          placeholder="Search medicine, batch, manufacturer..."
          aria-label="Search stock"
          className="flex-1 max-w-sm"
        />

        <SegmentedControl
          options={STOCK_FILTER_OPTIONS}
          value={filter}
          onValueChange={setFilter}
          size="sm"
          aria-label="Stock filter"
        />

        {canManage && (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add Stock
          </Button>
        )}
      </div>

      {/* Table */}
      {stockLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No stock items found"
          description={
            search || filter !== "all"
              ? "No items match your current filter. Try adjusting your search or filter."
              : "Add stock entries to start tracking inventory."
          }
          action={
            canManage
              ? { label: "Add Stock", onClick: () => setShowAddForm(true) }
              : undefined
          }
        />
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      {/* Add stock dialog */}
      {showAddForm && (
        <StockForm
          mode="add"
          stock={null}
          open={showAddForm}
          onOpenChange={setShowAddForm}
          medicines={medicines ?? []}
          suppliers={suppliers ?? []}
          onSubmit={(body) => {
            addStock.mutate(body, {
              onSuccess: () => {
                toast.success("Stock added successfully")
                setShowAddForm(false)
              },
              onError: (err) => {
                toast.error(err instanceof Error ? err.message : "Failed to add stock")
              },
            })
          }}
          isPending={addStock.isPending}
        />
      )}

      {/* Edit stock dialog */}
      {editingStock && (
        <StockForm
          mode="edit"
          stock={editingStock}
          open={!!editingStock}
          onOpenChange={(open) => { if (!open) setEditingStock(null) }}
          medicines={medicines ?? []}
          suppliers={suppliers ?? []}
          onSubmit={(body) => {
            const { medicineId: _m, ...patch } = body
            updateStock.mutate(
              { id: editingStock.id, body: patch },
              {
                onSuccess: () => {
                  toast.success("Stock updated")
                  setEditingStock(null)
                },
                onError: (err) => {
                  toast.error(err instanceof Error ? err.message : "Failed to update stock")
                },
              },
            )
          }}
          isPending={updateStock.isPending}
        />
      )}
    </div>
  )
}
