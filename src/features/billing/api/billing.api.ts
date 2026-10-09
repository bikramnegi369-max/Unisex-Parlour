import { apiClient } from "@/lib/api/axios";
import type { PaginatedResponse, ApiResponse } from "@/types/api.types";
import type {
  Invoice,
  PaymentRecord,
  CreateInvoicePayload,
  UpdateDraftInvoicePayload,
  RecordPaymentPayload,
  VoidPaymentPayload,
  CancelInvoicePayload,
  InvoiceListQuery,
  InvoiceLineItem,
  InvoiceListResponseMeta,
  CustomerBillingSummary,
} from "../types/billing.types";

const toFlatId = (val: unknown): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (typeof obj._id === "string") return obj._id;
    if (typeof obj.id === "string") return obj.id;
    return String(obj._id || obj.id || "");
  }
  return String(val);
};

export const normalizeInvoice = (rawInput: Record<string, unknown>): Invoice => {
  // If the backend wraps the invoice inside a "invoice" property (e.g. GET /billing/invoices/:id returns { invoice, payments })
  const raw =
    typeof rawInput.invoice === "object" && rawInput.invoice !== null
      ? (rawInput.invoice as Record<string, unknown>)
      : rawInput;

  const id = toFlatId(raw._id || raw.id);
  const organizationId = toFlatId(raw.organizationId);
  const branchId = toFlatId(raw.branchId);
  const customerId = toFlatId(raw.customerId);
  const appointmentId = toFlatId(raw.appointmentId);

  // Normalize customer summary (supporting customerId object, customerSnapshot, or customer)
  let customer = undefined;
  if (typeof raw.customerId === "object" && raw.customerId !== null) {
    const custObj = raw.customerId as Record<string, unknown>;
    customer = {
      id: customerId,
      name: (custObj.name as string) || "Customer",
      phone: (custObj.phone as string) || "",
      email: (custObj.email as string) || undefined,
    };
  } else if (typeof raw.customerSnapshot === "object" && raw.customerSnapshot !== null) {
    const snapObj = raw.customerSnapshot as Record<string, unknown>;
    customer = {
      id: customerId,
      name: (snapObj.name as string) || "Customer",
      phone: (snapObj.phone as string) || "",
      email: (snapObj.email as string) || undefined,
    };
  } else if (typeof raw.customer === "object" && raw.customer !== null) {
    const custObj = raw.customer as Record<string, unknown>;
    customer = {
      id: toFlatId(custObj.id || custObj._id || customerId),
      name: (custObj.name as string) || "Customer",
      phone: (custObj.phone as string) || "",
      email: (custObj.email as string) || undefined,
    };
  }

  // Normalize appointment summary (capturing appointmentCode directly from invoice or appointment object)
  const directAppointmentCode = (raw.appointmentCode as string) || undefined;
  let appointment = undefined;
  if (typeof raw.appointmentId === "object" && raw.appointmentId !== null) {
    const aptObj = raw.appointmentId as Record<string, unknown>;
    appointment = {
      id: appointmentId,
      appointmentCode: (aptObj.appointmentCode as string) || directAppointmentCode,
      date: (aptObj.date as string) || (aptObj.appointmentDate as string) || undefined,
      startTime: (aptObj.startTime as string) || (aptObj.timeSlot as string) || undefined,
    };
  } else if (typeof raw.appointment === "object" && raw.appointment !== null) {
    const aptObj = raw.appointment as Record<string, unknown>;
    appointment = {
      id: toFlatId(aptObj.id || aptObj._id || appointmentId),
      appointmentCode: (aptObj.appointmentCode as string) || directAppointmentCode,
      date: (aptObj.date as string) || (aptObj.appointmentDate as string) || undefined,
      startTime: (aptObj.startTime as string) || (aptObj.timeSlot as string) || undefined,
    };
  } else if (appointmentId || directAppointmentCode) {
    appointment = {
      id: appointmentId,
      appointmentCode: directAppointmentCode,
    };
  }

  // Normalize branch summary
  let branch = undefined;
  if (typeof raw.branchId === "object" && raw.branchId !== null) {
    const brObj = raw.branchId as Record<string, unknown>;
    branch = {
      id: branchId,
      name: (brObj.name as string) || "Branch",
      timezone: (brObj.timezone as string) || undefined,
    };
  } else if (typeof raw.branch === "object" && raw.branch !== null) {
    const brObj = raw.branch as Record<string, unknown>;
    branch = {
      id: toFlatId(brObj.id || brObj._id || branchId),
      name: (brObj.name as string) || "Branch",
      timezone: (brObj.timezone as string) || undefined,
    };
  }

  // Normalize line items: check both raw.lines (authoritative backend property) and raw.items
  const rawItems = Array.isArray(raw.lines)
    ? raw.lines
    : Array.isArray(raw.items)
    ? raw.items
    : [];

  const items: InvoiceLineItem[] = rawItems.map((itemRaw) => {
    const item = itemRaw as Record<string, unknown>;
    const srvName = (item.name as string) || (item.serviceName as string) || "Service";
    const isCovered =
      Boolean(item.isCoveredBySubscription) ||
      Boolean(item.isRedeemedViaSubscription) ||
      Boolean(item.appliedSubscriptionId);

    return {
      id: toFlatId(item._id || item.id),
      serviceId: toFlatId(item.serviceId),
      serviceName: srvName,
      name: srvName,
      duration: typeof item.duration === "number" ? item.duration : undefined,
      unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : Number(item.price) || 0,
      quantity: typeof item.quantity === "number" ? item.quantity : 1,
      lineTotal: typeof item.lineTotal === "number" ? item.lineTotal : Number(item.unitPrice || 0),
      isCoveredBySubscription: isCovered,
      isRedeemedViaSubscription: isCovered,
      appliedSubscriptionId: item.appliedSubscriptionId ? toFlatId(item.appliedSubscriptionId) : null,
      subscriptionCode: typeof item.subscriptionCode === "string" ? item.subscriptionCode : null,
      subscriptionPlanName: typeof item.subscriptionPlanName === "string" ? item.subscriptionPlanName : null,
      subscriptionUsageId: item.subscriptionUsageId ? toFlatId(item.subscriptionUsageId) : null,
      subscriptionCoveredAmount: typeof item.subscriptionCoveredAmount === "number" ? item.subscriptionCoveredAmount : 0,
      customerPayable: typeof item.customerPayable === "number" ? item.customerPayable : undefined,
    };
  });

  return {
    id,
    invoiceNumber: (raw.invoiceNumber as string) || (id ? `#INV-${id.slice(-6).toUpperCase()}` : ""),
    organizationId,
    branchId,
    customerId,
    appointmentId,
    appointmentCode: directAppointmentCode,
    status: (raw.status as Invoice["status"]) || "draft",
    paymentStatus: (raw.paymentStatus as Invoice["paymentStatus"]) || "unpaid",
    items,
    lines: items,
    subtotal: typeof raw.subtotal === "number" ? raw.subtotal : 0,
    discountTotal: typeof raw.discountTotal === "number" ? raw.discountTotal : 0,
    grossPayable: typeof raw.grossPayable === "number" ? raw.grossPayable : 0,
    subscriptionCoveredAmount: typeof raw.subscriptionCoveredAmount === "number" ? raw.subscriptionCoveredAmount : 0,
    payableAmount: typeof raw.payableAmount === "number" ? raw.payableAmount : 0,
    amountPaid: typeof raw.amountPaid === "number" ? raw.amountPaid : 0,
    amountDue: typeof raw.amountDue === "number" ? raw.amountDue : 0,
    notes: (raw.notes as string) || "",
    finalizedAt: (raw.finalizedAt as string) || null,
    cancelledAt: (raw.cancelledAt as string) || null,
    cancellationReason: (raw.cancellationReason as string) || null,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || new Date().toISOString(),
    customer,
    appointment,
    branch,
  };
};

export const normalizePayment = (raw: Record<string, unknown>): PaymentRecord => {
  const id = toFlatId(raw._id || raw.id);
  const invoiceId = toFlatId(raw.invoiceId);
  const organizationId = toFlatId(raw.organizationId);
  const branchId = toFlatId(raw.branchId);

  return {
    id,
    paymentNumber: (raw.paymentNumber as string) || (id ? `#PAY-${id.slice(-6).toUpperCase()}` : ""),
    invoiceId,
    organizationId,
    branchId,
    amount: typeof raw.amount === "number" ? raw.amount : Number(raw.amount) || 0,
    paymentMethod: (raw.paymentMethod as PaymentRecord["paymentMethod"]) || "cash",
    referenceNote: (raw.referenceNote as string) || "",
    status: (raw.status as PaymentRecord["status"]) || "recorded",
    paidAt: (raw.paidAt as string) || (raw.createdAt as string) || new Date().toISOString(),
    recordedBy: (raw.recordedBy as PaymentRecord["recordedBy"]) || undefined,
    voidedAt: (raw.voidedAt as string) || null,
    voidReason: (raw.voidReason as string) || null,
    voidedBy: (raw.voidedBy as PaymentRecord["voidedBy"]) || null,
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || new Date().toISOString(),
    isIdempotentReplay:
      typeof raw.isIdempotentReplay === "boolean"
        ? raw.isIdempotentReplay
        : raw.isIdempotentReplay
        ? Boolean(raw.isIdempotentReplay)
        : undefined,
  };
};

export interface InvoicesResponse extends PaginatedResponse<Invoice> {
  meta?: InvoiceListResponseMeta;
}

export const normalizeBillingSummary = (
  raw?: unknown
): CustomerBillingSummary | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;

  const toSafeNum = (val: unknown): number => {
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string") {
      const parsed = Number(val);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };

  return {
    totalInvoices: toSafeNum(s.totalInvoices),
    totalBilled: toSafeNum(s.totalBilled),
    totalPaid: toSafeNum(s.totalPaid),
    totalOutstanding: toSafeNum(s.totalOutstanding),
  };
};

/**
 * Fetch invoices list. Uses branchScope: "current" so centralized axios sets X-Branch-Id.
 */
export async function getInvoices(
  query: InvoiceListQuery = {}
): Promise<InvoicesResponse> {
  const sanitizedParams = { ...query };
  if (sanitizedParams.branchId === "all") {
    delete sanitizedParams.branchId;
  }

  const { data } = await apiClient.get<{
    success: boolean;
    status: string;
    message?: string;
    data: Record<string, unknown>[];
    meta?: Record<string, unknown>;
  }>("/billing/invoices", {
    params: sanitizedParams,
    branchScope: "current",
  });

  let meta: InvoiceListResponseMeta | undefined = undefined;
  if (data.meta) {
    const rawMeta = data.meta;
    meta = {
      total: typeof rawMeta.total === "number" ? rawMeta.total : Number(rawMeta.total) || 0,
      page: (rawMeta.page as string | number) ?? 1,
      limit: (rawMeta.limit as string | number) ?? 10,
      totalPages:
        typeof rawMeta.totalPages === "number"
          ? rawMeta.totalPages
          : Number(rawMeta.totalPages) || 1,
      summary: normalizeBillingSummary(rawMeta.summary),
    };
  }

  return {
    success: data.success,
    status: data.status,
    message: data.message,
    data: (data.data || []).map(normalizeInvoice),
    meta,
  };
}

/**
 * Fetch single invoice by ID.
 */
export async function getInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(
    `/billing/invoices/${id}`,
    {
      branchScope: "current",
    }
  );

  return normalizeInvoice(data.data);
}

/**
 * Create a draft invoice from an appointment.
 */
export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    "/billing/invoices",
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );

  return normalizeInvoice(data.data);
}

/**
 * Update draft invoice discount and notes.
 */
export async function updateDraftInvoice(
  id: string,
  payload: UpdateDraftInvoicePayload
): Promise<Invoice> {
  const { data } = await apiClient.patch<ApiResponse<Record<string, unknown>>>(
    `/billing/invoices/${id}`,
    payload,
    {
      branchScope: "current",
    }
  );

  return normalizeInvoice(data.data);
}

/**
 * Finalize an invoice. Financial figures become immutable.
 */
export async function finalizeInvoice(id: string): Promise<Invoice> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/billing/invoices/${id}/finalize`,
    {},
    {
      branchScope: "current",
    }
  );

  return normalizeInvoice(data.data);
}

/**
 * Cancel an invoice (valid only if amountPaid === 0).
 */
export async function cancelInvoice(
  id: string,
  payload: CancelInvoicePayload = {}
): Promise<Invoice> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/billing/invoices/${id}/cancel`,
    payload,
    {
      branchScope: "current",
    }
  );

  return normalizeInvoice(data.data);
}

/**
 * Fetch payments recorded against an invoice.
 */
export async function getInvoicePayments(invoiceId: string): Promise<PaymentRecord[]> {
  const { data } = await apiClient.get<{
    success: boolean;
    status: string;
    message?: string;
    data: Record<string, unknown>[];
  }>(`/billing/invoices/${invoiceId}/payments`, {
    branchScope: "current",
  });

  return (data.data || []).map(normalizePayment);
}

/**
 * Record a payment against a finalized invoice.
 */
export async function recordPayment(
  invoiceId: string,
  payload: RecordPaymentPayload
): Promise<PaymentRecord> {
  const headers: Record<string, string> = {};
  if (payload.idempotencyKey) {
    headers["Idempotency-Key"] = payload.idempotencyKey;
    headers["X-Idempotency-Key"] = payload.idempotencyKey;
  }

  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/billing/invoices/${invoiceId}/payments`,
    payload,
    {
      branchScope: "current",
      headers,
    }
  );

  const rawEnvelope = data.data || {};
  // Handle authoritative backend envelope { payment: {...}, invoice: {...}, isIdempotentReplay?: boolean }
  // while preserving backward compatibility if rawEnvelope is a flat payment object.
  const rawPayment =
    rawEnvelope.payment && typeof rawEnvelope.payment === "object"
      ? (rawEnvelope.payment as Record<string, unknown>)
      : rawEnvelope;

  const normalized = normalizePayment(rawPayment);

  // Preserve isIdempotentReplay from the envelope root or nested payment
  const isReplay =
    typeof rawEnvelope.isIdempotentReplay === "boolean"
      ? rawEnvelope.isIdempotentReplay
      : typeof rawPayment.isIdempotentReplay === "boolean"
      ? Boolean(rawPayment.isIdempotentReplay)
      : undefined;

  if (isReplay !== undefined) {
    normalized.isIdempotentReplay = isReplay;
  }

  return normalized;
}

/**
 * Void a previously recorded payment.
 */
export async function voidPayment(
  paymentId: string,
  payload: VoidPaymentPayload
): Promise<PaymentRecord> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/billing/payments/${paymentId}/void`,
    payload,
    {
      branchScope: "current",
    }
  );

  return normalizePayment(data.data);
}

/**
 * Fetch and download / preview official invoice PDF from GET /billing/invoices/:id/pdf.
 * Handles binary response and opens native PDF reader or triggers download.
 */
export async function downloadInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
  action: "open" | "download" = "open"
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/billing/invoices/${invoiceId}/pdf`,
    {
      responseType: "blob",
      branchScope: "current",
    }
  );

  const blob = new Blob([response.data], { type: "application/pdf" });
  const objectUrl = window.URL.createObjectURL(blob);

  if (action === "open") {
    // Open in native browser tab (where user has 1-click native print and download)
    const newTab = window.open(objectUrl, "_blank");
    if (!newTab) {
      // If popup blocker stopped opening new tab, fallback to direct download anchor
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } else {
    // Force direct file download
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${invoiceNumber || "invoice"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Revoke URL after a small delay so browser has time to load the PDF stream
  setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 10000);
}

