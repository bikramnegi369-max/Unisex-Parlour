import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementApi } from "../api/procurement.api";
import {
  SupplierFormValues,
  PurchaseOrderFormValues,
  ReceiveGoodsFormValues,
  SupplierInvoiceFormValues,
  SupplierPaymentFormValues,
} from "../schemas/procurement.schemas";
import { toast } from "sonner";

export const procurementKeys = {
  all: ["procurement"] as const,
  overview: (branchId?: string | null) => [...procurementKeys.all, "overview", branchId] as const,
  suppliers: (filters?: any) => [...procurementKeys.all, "suppliers", filters] as const,
  supplierDetail: (id: string) => [...procurementKeys.all, "suppliers", id] as const,
  orders: (filters?: any) => [...procurementKeys.all, "orders", filters] as const,
  orderDetail: (id: string) => [...procurementKeys.all, "orders", id] as const,
  receipts: (filters?: any) => [...procurementKeys.all, "receipts", filters] as const,
  invoices: (filters?: any) => [...procurementKeys.all, "invoices", filters] as const,
  invoiceDetail: (id: string) => [...procurementKeys.all, "invoices", id] as const,
  payments: (filters?: any) => [...procurementKeys.all, "payments", filters] as const,
};

// 1. Overview
export function useProcurementOverview(branchId?: string | null) {
  return useQuery({
    queryKey: procurementKeys.overview(branchId),
    queryFn: () => procurementApi.getOverview(branchId),
  });
}

// 2. Suppliers
export function useSuppliers(params?: {
  page?: number;
  limit?: number;
  status?: "active" | "inactive";
  search?: string;
}) {
  return useQuery({
    queryKey: procurementKeys.suppliers(params),
    queryFn: () => procurementApi.listSuppliers(params),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: procurementKeys.supplierDetail(id),
    queryFn: () => procurementApi.getSupplier(id),
    enabled: Boolean(id),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierFormValues) => procurementApi.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "suppliers"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });
      toast.success("Supplier registered successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create supplier");
    },
  });
}

export function useUpdateSupplier(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SupplierFormValues>) =>
      procurementApi.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "suppliers"] });
      queryClient.invalidateQueries({ queryKey: procurementKeys.supplierDetail(id) });
      toast.success("Supplier updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update supplier");
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementApi.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "suppliers"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });
      toast.success("Supplier deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete supplier");
    },
  });
}

// 3. Purchase Orders
export function usePurchaseOrders(params?: {
  branchId?: string | null;
  supplierId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: procurementKeys.orders(params),
    queryFn: () => procurementApi.listPurchaseOrders(params),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: procurementKeys.orderDetail(id),
    queryFn: () => procurementApi.getPurchaseOrder(id),
    enabled: Boolean(id),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PurchaseOrderFormValues) =>
      procurementApi.createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "orders"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });
      toast.success("Purchase order drafted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create purchase order");
    },
  });
}

export function useUpdatePurchaseOrderStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: "ordered" | "cancelled"; cancelReason?: string }) =>
      procurementApi.updatePurchaseOrderStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "orders"] });
      queryClient.invalidateQueries({ queryKey: procurementKeys.orderDetail(id) });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });
      toast.success("Order status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update order status");
    },
  });
}

// 4. Goods Receiving (GRN)
export function useReceiveGoods(poId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReceiveGoodsFormValues) => procurementApi.receiveGoods(poId, data),
    onSuccess: () => {
      // Invalidate procurement queries
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "orders"] });
      queryClient.invalidateQueries({ queryKey: procurementKeys.orderDetail(poId) });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "receipts"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });

      // Non-negotiable mandatory inventory cache invalidations
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", "movements"] });

      toast.success("Goods received and inventory ledger updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to record goods receipt");
    },
  });
}

export function useGoodsReceipts(params?: {
  branchId?: string | null;
  purchaseOrderId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: procurementKeys.receipts(params),
    queryFn: () => procurementApi.listGoodsReceipts(params),
  });
}

// 5. Invoices
export function useSupplierInvoices(params?: {
  branchId?: string | null;
  supplierId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: procurementKeys.invoices(params),
    queryFn: () => procurementApi.listInvoices(params),
  });
}

export function useSupplierInvoice(id: string) {
  return useQuery({
    queryKey: procurementKeys.invoiceDetail(id),
    queryFn: () => procurementApi.getInvoice(id),
    enabled: Boolean(id),
  });
}

export function useCreateSupplierInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierInvoiceFormValues) =>
      procurementApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "invoices"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });
      toast.success("Supplier invoice recorded successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to record invoice");
    },
  });
}

// 6. Payments
export function useSupplierPayments(params?: {
  branchId?: string | null;
  supplierId?: string;
  supplierInvoiceId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: procurementKeys.payments(params),
    queryFn: () => procurementApi.listPayments(params),
  });
}

export function useRecordSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SupplierPaymentFormValues) =>
      procurementApi.recordPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "payments"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "invoices"] });
      queryClient.invalidateQueries({ queryKey: [...procurementKeys.all, "overview"] });
      toast.success("Supplier payment recorded successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to record payment");
    },
  });
}
