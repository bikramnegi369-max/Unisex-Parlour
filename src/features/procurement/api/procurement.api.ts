import { apiClient } from "@/lib/api/axios";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";
import {
  Supplier,
  PurchaseOrder,
  GoodsReceiptNote,
  SupplierInvoice,
  SupplierPayment,
  ProcurementOverview,
} from "../types/procurement.types";
import {
  SupplierFormValues,
  PurchaseOrderFormValues,
  ReceiveGoodsFormValues,
  SupplierInvoiceFormValues,
  SupplierPaymentFormValues,
} from "../schemas/procurement.schemas";

interface RawEntityDTO {
  _id?: string;
  id?: string;
  [key: string]: any;
}

const normalizeId = <T extends { id: string }>(raw: RawEntityDTO): T => {
  const { _id, ...rest } = raw;
  return {
    ...rest,
    id: raw.id || _id || "",
  } as unknown as T;
};

export const procurementApi = {
  // 1. Overview
  async getOverview(branchId?: string | null): Promise<ProcurementOverview> {
    const params = branchId && branchId !== "all" ? { branchId } : {};
    const res = await apiClient.get<ApiResponse<ProcurementOverview>>("/procurement/overview", {
      params,
    });
    return res.data.data;
  },

  // 2. Suppliers
  async listSuppliers(params?: {
    page?: number;
    limit?: number;
    status?: "active" | "inactive";
    search?: string;
  }): Promise<PaginatedResponse<Supplier>> {
    const res = await apiClient.get<any>("/procurement/suppliers", {
      params,
    });
    const items = (res.data?.data || []).map((s: RawEntityDTO) => normalizeId<Supplier>(s));
    return {
      success: true,
      status: "success",
      data: items,
      meta: {
        total: res.data?.pagination?.total || items.length,
        page: res.data?.pagination?.page || 1,
        limit: res.data?.pagination?.limit || 20,
        totalPages: res.data?.pagination?.totalPages || 1,
      },
    };
  },

  async getSupplier(id: string): Promise<Supplier> {
    const res = await apiClient.get<ApiResponse<RawEntityDTO>>(`/procurement/suppliers/${id}`);
    return normalizeId<Supplier>(res.data.data);
  },

  async createSupplier(data: SupplierFormValues): Promise<Supplier> {
    const res = await apiClient.post<ApiResponse<RawEntityDTO>>("/procurement/suppliers", data);
    return normalizeId<Supplier>(res.data.data);
  },

  async updateSupplier(id: string, data: Partial<SupplierFormValues>): Promise<Supplier> {
    const res = await apiClient.put<ApiResponse<RawEntityDTO>>(`/procurement/suppliers/${id}`, data);
    return normalizeId<Supplier>(res.data.data);
  },

  // 3. Purchase Orders
  async listPurchaseOrders(params?: {
    branchId?: string | null;
    supplierId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PurchaseOrder>> {
    const query: any = { ...params };
    if (query.branchId === "all" || !query.branchId) delete query.branchId;

    const res = await apiClient.get<any>("/procurement/orders", {
      params: query,
    });
    const items = (res.data?.data || []).map((po: RawEntityDTO) => normalizeId<PurchaseOrder>(po));
    return {
      success: true,
      status: "success",
      data: items,
      meta: {
        total: res.data?.pagination?.total || items.length,
        page: res.data?.pagination?.page || 1,
        limit: res.data?.pagination?.limit || 20,
        totalPages: res.data?.pagination?.totalPages || 1,
      },
    };
  },

  async getPurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await apiClient.get<ApiResponse<RawEntityDTO>>(`/procurement/orders/${id}`);
    return normalizeId<PurchaseOrder>(res.data.data);
  },

  async createPurchaseOrder(data: PurchaseOrderFormValues): Promise<PurchaseOrder> {
    const payload = { ...data };
    if (payload.branchId === "all") delete payload.branchId;
    const res = await apiClient.post<ApiResponse<RawEntityDTO>>("/procurement/orders", payload);
    return normalizeId<PurchaseOrder>(res.data.data);
  },

  async updatePurchaseOrderStatus(
    id: string,
    data: { status: "ordered" | "cancelled"; cancelReason?: string }
  ): Promise<PurchaseOrder> {
    const res = await apiClient.patch<ApiResponse<RawEntityDTO>>(
      `/procurement/orders/${id}/status`,
      data
    );
    return normalizeId<PurchaseOrder>(res.data.data);
  },

  // 4. Goods Receiving
  async receiveGoods(
    poId: string,
    data: ReceiveGoodsFormValues
  ): Promise<{ receipt: GoodsReceiptNote; purchaseOrder: PurchaseOrder }> {
    const idempotencyKey = `grn_${poId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const res = await apiClient.post<
      ApiResponse<{ receipt: RawEntityDTO; purchaseOrder: RawEntityDTO }>
    >(`/procurement/orders/${poId}/receive`, data, {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });
    return {
      receipt: normalizeId<GoodsReceiptNote>(res.data.data.receipt),
      purchaseOrder: normalizeId<PurchaseOrder>(res.data.data.purchaseOrder),
    };
  },

  async listGoodsReceipts(params?: {
    branchId?: string | null;
    purchaseOrderId?: string;
    supplierId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<GoodsReceiptNote>> {
    const query: any = { ...params };
    if (query.branchId === "all" || !query.branchId) delete query.branchId;

    const res = await apiClient.get<any>("/procurement/receipts", {
      params: query,
    });
    const items = (res.data?.data || []).map((grn: RawEntityDTO) => normalizeId<GoodsReceiptNote>(grn));
    return {
      success: true,
      status: "success",
      data: items,
      meta: {
        total: res.data?.pagination?.total || items.length,
        page: res.data?.pagination?.page || 1,
        limit: res.data?.pagination?.limit || 20,
        totalPages: res.data?.pagination?.totalPages || 1,
      },
    };
  },

  // 5. Invoices
  async listInvoices(params?: {
    branchId?: string | null;
    supplierId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SupplierInvoice>> {
    const query: any = { ...params };
    if (query.branchId === "all" || !query.branchId) delete query.branchId;

    const res = await apiClient.get<any>("/procurement/invoices", {
      params: query,
    });
    const items = (res.data?.data || []).map((inv: RawEntityDTO) => normalizeId<SupplierInvoice>(inv));
    return {
      success: true,
      status: "success",
      data: items,
      meta: {
        total: res.data?.pagination?.total || items.length,
        page: res.data?.pagination?.page || 1,
        limit: res.data?.pagination?.limit || 20,
        totalPages: res.data?.pagination?.totalPages || 1,
      },
    };
  },

  async getInvoice(id: string): Promise<SupplierInvoice> {
    const res = await apiClient.get<ApiResponse<RawEntityDTO>>(`/procurement/invoices/${id}`);
    return normalizeId<SupplierInvoice>(res.data.data);
  },

  async createInvoice(data: SupplierInvoiceFormValues): Promise<SupplierInvoice> {
    const payload = { ...data };
    if (payload.branchId === "all") delete payload.branchId;
    const res = await apiClient.post<ApiResponse<RawEntityDTO>>("/procurement/invoices", payload);
    return normalizeId<SupplierInvoice>(res.data.data);
  },

  // 6. Payments
  async listPayments(params?: {
    branchId?: string | null;
    supplierId?: string;
    supplierInvoiceId?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SupplierPayment>> {
    const query: any = { ...params };
    if (query.branchId === "all" || !query.branchId) delete query.branchId;

    const res = await apiClient.get<any>("/procurement/payments", {
      params: query,
    });
    const items = (res.data?.data || []).map((pay: RawEntityDTO) => normalizeId<SupplierPayment>(pay));
    return {
      success: true,
      status: "success",
      data: items,
      meta: {
        total: res.data?.pagination?.total || items.length,
        page: res.data?.pagination?.page || 1,
        limit: res.data?.pagination?.limit || 20,
        totalPages: res.data?.pagination?.totalPages || 1,
      },
    };
  },

  async recordPayment(
    data: SupplierPaymentFormValues
  ): Promise<{ payment: SupplierPayment; invoice: SupplierInvoice }> {
    const idempotencyKey = `spay_${data.supplierInvoiceId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = { ...data };
    if (payload.branchId === "all") delete payload.branchId;

    const res = await apiClient.post<
      ApiResponse<{ payment: RawEntityDTO; invoice: RawEntityDTO }>
    >("/procurement/payments", payload, {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });
    return {
      payment: normalizeId<SupplierPayment>(res.data.data.payment),
      invoice: normalizeId<SupplierInvoice>(res.data.data.invoice),
    };
  },
};
