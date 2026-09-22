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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DataTable,
  EmptyState,
  ErrorState,
  ConfirmationModal,
} from "@/components/patterns"
import type { ColumnDef } from "@/components/patterns"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductForm } from "./product-form"
import { useOpticalProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "./hooks"
import type { OpticalProduct, CreateOpticalProductBody } from "./types"

interface ProductsTabProps {
  canEdit: boolean
}

export function ProductsTab({ canEdit }: ProductsTabProps) {
  const { data: products, isLoading, isError, error, refetch } = useOpticalProducts()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<OpticalProduct | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
            cell: (p: OpticalProduct) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => setEditing(p)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => setDeletingId(p.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {products?.length ?? 0} product{products?.length !== 1 ? "s" : ""}
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Add Product
          </Button>
        )}
      </div>

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
      ) : (
        <DataTable
          columns={columns}
          data={products ?? []}
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
