/**
 * optical/products-tab.tsx
 *
 * Product CRUD:
 *   - GET /optical/products    (optical:view)
 *   - POST /optical/products   (optical:edit)
 *   - PATCH /optical/products/{id} (optical:edit)
 *   - DELETE /optical/products/{id} (optical:edit)
 */

import { useState } from "react"
import { Plus, Pencil, Trash2, MoreHorizontal, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmationModal,
  SingleSelect,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductForm } from "./product-form"
import { useOpticalProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "./hooks"
import type { OpticalProduct, CreateOpticalProductBody } from "./types"
import { OPTICAL_CATEGORY_OPTIONS } from "./types"

const CATEGORY_FILTER_OPTIONS = [{ value: "All", label: "All Categories" }, ...OPTICAL_CATEGORY_OPTIONS]

interface ProductsTabProps {
  canEdit: boolean
}

export function ProductsTab({ canEdit }: ProductsTabProps) {
  const { data: products, isLoading, isError, error, refetch } = useOpticalProducts()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<OpticalProduct | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Main filters server-side (getOpticalProducts/InventoryTab.tsx's `search`/
  // `filterCategory` state); this endpoint returns the full list unpaginated,
  // so the same result is reached by filtering client-side here.
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")

  const filteredProducts = (products ?? []).filter((p) => {
    const s = search.toLowerCase()
    const matchesSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.brand ?? "").toLowerCase().includes(s)
    const matchesCategory = filterCategory === "All" || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const createMutation = useCreateProduct(() => setShowCreate(false))
  const updateMutation = useUpdateProduct(
    editing?.id ?? "",
    () => setEditing(null),
  )
  const deleteMutation = useDeleteProduct(() => setDeletingId(null))

  const deletingProduct = products?.find((p) => p.id === deletingId)

  const columns: ColumnDef<OpticalProduct>[] = [
    {
      key: "name",
      header: "Product",
      cell: (p) => (
        <div>
          <p className="font-medium text-foreground">{p.name}</p>
          {p.brand && (
            <p className="text-xs text-muted-foreground">{p.brand}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => (
        <Badge variant="secondary" className="font-normal">
          {p.category}
        </Badge>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (p) => <span className="text-sm">{p.type ?? "—"}</span>,
    },
    {
      key: "material",
      header: "Material",
      cell: (p) => <span className="text-sm">{p.material ?? "—"}</span>,
    },
    {
      key: "modelNumber",
      header: "Model No.",
      cell: (p) => (
        <span className="text-sm font-mono">{p.modelNumber ?? "—"}</span>
      ),
    },
    {
      key: "gstPercent",
      header: "GST %",
      cell: (p) => <span className="text-sm tabular-nums">{p.gstPercent}%</span>,
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            align: "center",
            cell: (p: OpticalProduct) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label={`Actions for ${p.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" aria-hidden />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setDeletingId(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" aria-hidden />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColumnDef<OpticalProduct>,
        ]
      : []),
  ]

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load products"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-8"
            aria-label="Search products"
          />
        </div>
        <SingleSelect
          options={CATEGORY_FILTER_OPTIONS}
          value={filterCategory}
          onChange={setFilterCategory}
          className="w-36"
          aria-label="Filter by category"
        />
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add Product
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
      </p>

      {products && products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first optical product to get started."
          action={
            canEdit
              ? { label: "Add Product", onClick: () => setShowCreate(true) }
              : undefined
          }
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No matching products"
          description="Try a different search term or category filter."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredProducts}
          aria-label="Optical products table"
        />
      )}

      {/* Create dialog */}
      <ProductForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(body: CreateOpticalProductBody) => createMutation.mutate(body)}
        isPending={createMutation.isPending}
      />

      {/* Edit dialog */}
      <ProductForm
        open={editing != null}
        onClose={() => setEditing(null)}
        product={editing ?? undefined}
        onSubmit={(body: CreateOpticalProductBody) => updateMutation.mutate(body)}
        isPending={updateMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmationModal
        open={deletingId != null}
        onOpenChange={(v) => { if (!v) setDeletingId(null) }}
        onConfirm={() => {
          if (deletingId) deleteMutation.mutate(deletingId)
        }}
        title="Remove Product"
        description={
          deletingProduct
            ? `Remove "${deletingProduct.name}"? This will soft-delete the product. Existing stock and bill records will be preserved.`
            : "Remove this product?"
        }
        variant="destructive"
        confirmLabel="Remove"
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
