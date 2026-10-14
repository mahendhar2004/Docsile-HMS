/**
 * pharmacy/hooks.ts
 *
 * TanStack Query hooks for all pharmacy endpoints.
 * Permission keys cross-checked against OpenAPI x-permission annotations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery"
import type {
  PharmacyMedicine,
  MedicineFormValues,
  PharmacyStockItem,
  StockSummary,
  MedicineStockSearchResult,
  AddStockBody,
  UpdateStockBody,
  PharmacySupplier,
  SupplierFormValues,
  PurchaseOrder,
  CreatePurchaseOrderBody,
  ReceivePurchaseOrderBody,
  PharmacyBill,
  CreatePharmacyBillBody,
  PendingMedicinePatient,
  PatientPrescriptionResponse,
} from "./types"

// ─── Query key factory ────────────────────────────────────────────────────────

export const pharmacyKeys = {
  medicines: ["pharmacy", "medicines"] as const,
  stock: ["pharmacy", "stock"] as const,
  stockSummary: ["pharmacy", "stock", "summary"] as const,
  stockSearch: (q: string) => ["pharmacy", "stock", "search", q] as const,
  suppliers: ["pharmacy", "suppliers"] as const,
  purchaseOrders: (status?: string) =>
    ["pharmacy", "purchase-orders", { status }] as const,
  bills: ["pharmacy", "bills"] as const,
  pendingMedicines: ["pharmacy", "pending-medicines"] as const,
  patientPrescription: (patientId: string) =>
    ["pharmacy", "patient", patientId, "prescription"] as const,
}

// ─── Medicines ────────────────────────────────────────────────────────────────

/**
 * List all active medicines.
 * x-permission: pharmacy:view
 */
export function useMedicines(enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.medicines,
    queryFn: () =>
      apiClient
        .get<PharmacyMedicine[]>("/pharmacy/medicines")
        .then((e) => e.data),
    enabled,
  })
}

/**
 * Create a new medicine.
 * x-permission: pharmacy:manage_stock
 */
export function useCreateMedicine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MedicineFormValues) =>
      apiClient
        .post<PharmacyMedicine>("/pharmacy/medicines", body)
        .then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.medicines })
    },
  })
}

/**
 * Update an existing medicine.
 * x-permission: pharmacy:manage_stock
 */
export function useUpdateMedicine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MedicineFormValues> }) =>
      apiClient.patch(`/pharmacy/medicines/${id}`, body).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.medicines })
    },
  })
}

/**
 * Soft-delete a medicine.
 * x-permission: pharmacy:manage_stock
 */
export function useDeleteMedicine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/pharmacy/medicines/${id}`).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.medicines })
    },
  })
}

// ─── Stock ────────────────────────────────────────────────────────────────────

/**
 * List all in-stock items.
 * x-permission: pharmacy:view
 */
export function useStock(enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.stock,
    queryFn: () =>
      apiClient
        .get<PharmacyStockItem[]>("/pharmacy/stock")
        .then((e) => e.data),
    enabled,
  })
}

/**
 * Stock summary: totals, low-stock count, near-expiry count.
 * x-permission: pharmacy:view
 */
export function useStockSummary(enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.stockSummary,
    queryFn: () =>
      apiClient
        .get<StockSummary>("/pharmacy/stock/summary")
        .then((e) => e.data),
    enabled,
  })
}

/**
 * Search medicine stock by name for billing.
 * x-permission: pharmacy:view
 */
export function useStockSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.stockSearch(q),
    queryFn: () =>
      apiClient
        .get<MedicineStockSearchResult[]>(`/pharmacy/stock/search?q=${encodeURIComponent(q)}`)
        .then((e) => e.data),
    enabled: enabled && q.length >= 2,
  })
}

/**
 * Add new stock entry.
 * x-permission: pharmacy:manage_stock
 */
export function useAddStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddStockBody) =>
      apiClient.post("/pharmacy/stock", body).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stock })
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stockSummary })
    },
  })
}

/**
 * Update a stock entry (quantity, MRP, cost, expiry, batch).
 * x-permission: pharmacy:manage_stock
 */
export function useUpdateStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStockBody }) =>
      apiClient.patch(`/pharmacy/stock/${id}`, body).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stock })
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stockSummary })
    },
  })
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

/**
 * List all active suppliers.
 * x-permission: pharmacy:view
 */
export function useSuppliers(enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.suppliers,
    queryFn: () =>
      apiClient
        .get<PharmacySupplier[]>("/pharmacy/suppliers")
        .then((e) => e.data),
    enabled,
  })
}

/**
 * Create a new supplier.
 * x-permission: pharmacy:manage_stock
 */
export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SupplierFormValues) =>
      apiClient.post("/pharmacy/suppliers", body).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.suppliers })
    },
  })
}

/**
 * Update an existing supplier.
 * x-permission: pharmacy:manage_stock
 */
export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: Partial<SupplierFormValues>
    }) =>
      apiClient.patch(`/pharmacy/suppliers/${id}`, body).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.suppliers })
    },
  })
}

/**
 * Soft-delete a supplier.
 * x-permission: pharmacy:manage_stock
 */
export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/pharmacy/suppliers/${id}`).then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.suppliers })
    },
  })
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

/**
 * List purchase orders, optionally filtered by status.
 * x-permission: pharmacy:purchase_orders
 */
export function usePurchaseOrders(status?: string, enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.purchaseOrders(status),
    queryFn: () => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : ""
      return apiClient
        .get<PurchaseOrder[]>(`/pharmacy/purchase-orders${qs}`)
        .then((e) => e.data)
    },
    enabled,
  })
}

/**
 * Create a new purchase order with line items.
 * x-permission: pharmacy:purchase_orders
 */
export function useCreatePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePurchaseOrderBody) =>
      apiClient
        .post<{ orderNumber: string }>("/pharmacy/purchase-orders", body)
        .then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pharmacy", "purchase-orders"] })
    },
  })
}

/**
 * Receive items on a purchase order (updates stock).
 * x-permission: pharmacy:purchase_orders
 */
export function useReceivePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReceivePurchaseOrderBody }) =>
      apiClient
        .post(`/pharmacy/purchase-orders/${id}/receive`, body)
        .then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pharmacy", "purchase-orders"] })
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stock })
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stockSummary })
    },
  })
}

/**
 * Update purchase order status (ORDERED, CANCELLED, etc.).
 * x-permission: pharmacy:purchase_orders
 */
export function useUpdatePOStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient
        .patch(`/pharmacy/purchase-orders/${id}/status`, { status })
        .then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pharmacy", "purchase-orders"] })
    },
  })
}

// ─── Pharmacy Bills ───────────────────────────────────────────────────────────

/**
 * Paginated pharmacy bills list.
 * x-permission: pharmacy:view
 */
export function usePharmacyBills(
  opts: { dateFrom?: string; dateTo?: string; enabled?: boolean } = {},
) {
  const { dateFrom, dateTo, enabled = true } = opts
  return usePaginatedQuery<PharmacyBill>({
    queryKey: [...pharmacyKeys.bills, dateFrom ?? null, dateTo ?? null],
    queryFn: ({ page, pageSize }) => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      return apiClient.get<PharmacyBill[]>(`/pharmacy/bills?${params}`)
    },
    initialPageSize: 50,
    queryOptions: { enabled },
  })
}

/**
 * Create a pharmacy bill with line items.
 * x-permission: pharmacy:create
 */
export function useCreatePharmacyBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePharmacyBillBody) =>
      apiClient
        .post<{ billNumber: string; billAmount: number }>("/pharmacy/bills", body)
        .then((e) => e.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pharmacyKeys.bills })
      void qc.invalidateQueries({ queryKey: pharmacyKeys.stock })
      void qc.invalidateQueries({ queryKey: pharmacyKeys.pendingMedicines })
    },
  })
}

// ─── Pending Medicines ────────────────────────────────────────────────────────

/**
 * List patients with prescribed but not yet dispensed medicines.
 * x-permission: pharmacy:view
 */
export function usePendingMedicines(enabled = true) {
  return useQuery({
    queryKey: pharmacyKeys.pendingMedicines,
    queryFn: () =>
      apiClient
        .get<PendingMedicinePatient[]>("/pharmacy/pending-medicines")
        .then((e) => e.data),
    enabled,
  })
}

// ─── Patient Prescription Lookup ──────────────────────────────────────────────

/**
 * Look up a patient's latest prescription for dispensing.
 * x-permission: pharmacy:view
 */
export function usePatientPrescription(patientId: string, enabled = false) {
  return useQuery({
    queryKey: pharmacyKeys.patientPrescription(patientId),
    queryFn: () =>
      apiClient
        .get<PatientPrescriptionResponse>(
          `/pharmacy/patients/${encodeURIComponent(patientId)}/prescription`,
        )
        .then((e) => e.data),
    enabled: enabled && patientId.length > 0,
  })
}
