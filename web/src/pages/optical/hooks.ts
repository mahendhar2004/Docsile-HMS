/**
 * optical/hooks.ts
 *
 * All data-fetching and mutation hooks for the Optical module.
 *
 * Query hooks:
 *   - useOpticalProducts        — GET /optical/products
 *   - useOpticalStock           — GET /optical/stock
 *   - useStockSummary           — GET /optical/stock/summary
 *   - useStockSearch            — GET /optical/stock/search?q=...
 *   - useOpticalBills           — GET /optical/bills (paginated)
 *   - usePatientArReading       — GET /optical/patients/{id}/ar-reading
 *   - useOpticalSettings        — GET /optical/settings
 *   - useHospitalProfile        — GET /optical/hospital-profile
 *
 * Mutation hooks:
 *   - useCreateProduct          — POST /optical/products (optical:edit)
 *   - useUpdateProduct          — PATCH /optical/products/{id} (optical:edit)
 *   - useDeleteProduct          — DELETE /optical/products/{id} (optical:edit)
 *   - useAddStock               — POST /optical/stock (optical:edit)
 *   - useUpdateStock            — PATCH /optical/stock/{id} (optical:edit)
 *   - useCreateBill             — POST /optical/bills (optical:create)
 *   - useUpdateBillStatus       — PATCH /optical/bills/{id}/status (optical:edit)
 *   - useUpdateSettings         — PATCH /optical/settings (settings:edit)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/components/ui/sonner"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  OpticalProduct,
  CreateOpticalProductBody,
  UpdateOpticalProductBody,
  OpticalStockEntry,
  CreateOpticalStockBody,
  UpdateOpticalStockBody,
  StockSummary,
  StockSearchResult,
  OpticalBillRow,
  CreateOpticalBillBody,
  UpdateBillStatusBody,
  PatientArReading,
  OpticalSettings,
  HospitalProfile,
} from "./types"

// ─── Query key factory ─────────────────────────────────────────────────────────

export const opticalKeys = {
  all: ["optical"] as const,
  products: () => [...opticalKeys.all, "products"] as const,
  stock: () => [...opticalKeys.all, "stock"] as const,
  stockSummary: () => [...opticalKeys.all, "stock", "summary"] as const,
  stockSearch: (q: string) => [...opticalKeys.all, "stock", "search", q] as const,
  bills: () => [...opticalKeys.all, "bills"] as const,
  billList: (filters: Record<string, unknown>) =>
    [...opticalKeys.bills(), "list", filters] as const,
  patientAr: (patientId: string) =>
    [...opticalKeys.all, "patients", patientId, "ar-reading"] as const,
  settings: () => [...opticalKeys.all, "settings"] as const,
  hospitalProfile: () => [...opticalKeys.all, "hospital-profile"] as const,
} as const

// ─── Query hooks ───────────────────────────────────────────────────────────────

/**
 * List all active optical products.
 * Endpoint: GET /optical/products
 * Permission: optical:view
 */
export function useOpticalProducts(enabled = true) {
  return useQuery({
    queryKey: opticalKeys.products(),
    queryFn: () =>
      apiClient.get<OpticalProduct[]>("/optical/products").then((e) => e.data),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * List optical stock entries with nested product data.
 * Endpoint: GET /optical/stock
 * Permission: optical:view
 */
export function useOpticalStock(enabled = true) {
  return useQuery({
    queryKey: opticalKeys.stock(),
    queryFn: () =>
      apiClient.get<OpticalStockEntry[]>("/optical/stock").then((e) => e.data),
    enabled,
    staleTime: 30 * 1000,
  })
}

/**
 * Stock summary: total items + low-stock count.
 * Endpoint: GET /optical/stock/summary
 * Permission: optical:view
 */
export function useStockSummary(enabled = true) {
  return useQuery({
    queryKey: opticalKeys.stockSummary(),
    queryFn: () =>
      apiClient.get<StockSummary>("/optical/stock/summary").then((e) => e.data),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Search stock items for bill creation.
 * Endpoint: GET /optical/stock/search?q=...
 * Permission: optical:view
 * Only fires when q has at least 2 characters.
 */
export function useStockSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: opticalKeys.stockSearch(q),
    queryFn: () =>
      apiClient
        .get<StockSearchResult[]>(`/optical/stock/search?q=${encodeURIComponent(q)}`)
        .then((e) => e.data),
    enabled: enabled && q.length >= 2,
    staleTime: 30 * 1000,
  })
}

/**
 * Paginated optical bills list.
 * Endpoint: GET /optical/bills?page=N&pageSize=N&date=YYYY-MM-DD
 * Permission: optical:view
 */
export function useOpticalBills(
  filters: { date?: string; dateFrom?: string; dateTo?: string; status?: string; search?: string } = {},
  enabled = true,
) {
  const params = new URLSearchParams()
  if (filters.date) params.set("date", filters.date)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  if (filters.status) params.set("status", filters.status)
  if (filters.search) params.set("search", filters.search)
  const qs = params.toString()

  return usePaginatedQuery<OpticalBillRow>({
    queryKey: opticalKeys.billList({ ...filters }),
    queryFn: ({ page, pageSize }) =>
      apiClient.get<OpticalBillRow[]>(
        `/optical/bills?page=${page}&pageSize=${pageSize}${qs ? `&${qs}` : ""}`,
      ),
    initialPageSize: 25,
    queryOptions: { enabled },
  })
}

/**
 * Patient AR reading lookup.
 * Endpoint: GET /optical/patients/{patientId}/ar-reading
 * Permission: optical:view
 * Only fires when patientId is non-null.
 */
export function usePatientArReading(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: opticalKeys.patientAr(patientId ?? ""),
    queryFn: () =>
      apiClient
        .get<PatientArReading>(`/optical/patients/${patientId!}/ar-reading`)
        .then((e) => e.data),
    enabled: enabled && patientId != null,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Optical settings.
 * Endpoint: GET /optical/settings
 * Permission: settings:view
 */
export function useOpticalSettings(enabled = true) {
  return useQuery({
    queryKey: opticalKeys.settings(),
    queryFn: () =>
      apiClient.get<OpticalSettings>("/optical/settings").then((e) => e.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hospital profile for receipt printing.
 * Endpoint: GET /optical/hospital-profile
 * Permission: optical:view
 */
export function useHospitalProfile(enabled = true) {
  return useQuery({
    queryKey: opticalKeys.hospitalProfile(),
    queryFn: () =>
      apiClient
        .get<HospitalProfile>("/optical/hospital-profile")
        .then((e) => e.data),
    enabled,
    staleTime: 10 * 60 * 1000,
  })
}

// ─── Mutation hooks ────────────────────────────────────────────────────────────

/**
 * Create a new optical product.
 * Endpoint: POST /optical/products
 * Permission: optical:edit
 */
export function useCreateProduct(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOpticalProductBody) =>
      apiClient.post("/optical/products", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.products() })
      toast.success("Product added.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to add product.")
    },
  })
}

/**
 * Update an optical product.
 * Endpoint: PATCH /optical/products/{id}
 * Permission: optical:edit
 */
export function useUpdateProduct(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateOpticalProductBody) =>
      apiClient.patch(`/optical/products/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.products() })
      toast.success("Product updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product.",
      )
    },
  })
}

/**
 * Soft-delete an optical product (sets isActive=false).
 * Endpoint: DELETE /optical/products/{id}
 * Permission: optical:edit
 */
export function useDeleteProduct(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/optical/products/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.products() })
      toast.success("Product removed.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove product.",
      )
    },
  })
}

/**
 * Add (upsert) a stock entry.
 * Endpoint: POST /optical/stock
 * Permission: optical:edit
 */
export function useAddStock(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOpticalStockBody) =>
      apiClient.post("/optical/stock", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.stock() })
      void qc.invalidateQueries({ queryKey: opticalKeys.stockSummary() })
      toast.success("Stock added.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to add stock.")
    },
  })
}

/**
 * Update a stock entry (quantity, mrp, costPrice).
 * Endpoint: PATCH /optical/stock/{id}
 * Permission: optical:edit
 */
export function useUpdateStock(id: string, onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateOpticalStockBody) =>
      apiClient.patch(`/optical/stock/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.stock() })
      void qc.invalidateQueries({ queryKey: opticalKeys.stockSummary() })
      toast.success("Stock updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update stock.",
      )
    },
  })
}

/**
 * Create an optical bill.
 * Endpoint: POST /optical/bills
 * Permission: optical:create
 */
export function useCreateBill(onSuccess?: (bill: OpticalBillRow) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateOpticalBillBody) =>
      apiClient.post<OpticalBillRow>("/optical/bills", body).then((e) => e.data),
    onSuccess: (bill) => {
      void qc.invalidateQueries({ queryKey: opticalKeys.bills() })
      void qc.invalidateQueries({ queryKey: opticalKeys.stock() })
      void qc.invalidateQueries({ queryKey: opticalKeys.stockSummary() })
      toast.success(`Bill ${bill.billNumber} created.`)
      onSuccess?.(bill)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create bill.")
    },
  })
}

/**
 * Update optical bill status (ORDERED → READY → COMPLETED etc.)
 * Endpoint: PATCH /optical/bills/{id}/status
 * Permission: optical:edit
 */
export function useUpdateBillStatus(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string } & UpdateBillStatusBody) =>
      apiClient.patch(`/optical/bills/${id}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.bills() })
      toast.success("Bill status updated.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update bill status.",
      )
    },
  })
}

/**
 * Update optical settings.
 * Endpoint: PATCH /optical/settings
 * Permission: settings:edit
 */
export function useUpdateSettings(onSuccess?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<OpticalSettings>) =>
      apiClient.patch("/optical/settings", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: opticalKeys.settings() })
      toast.success("Optical settings saved.")
      onSuccess?.()
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings.",
      )
    },
  })
}
