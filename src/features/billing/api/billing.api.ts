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
  AppliedDiscount,
  DiscountHistoryEntry,
  ApplyDiscountPayload,
  ModifyDiscountPayload,
  RemoveDiscountPayload,
  InvoiceDiscountMutationResult,
} from "../types/billing.types";
import { normalizeAppointment } from "@/features/appointments/api/appointments.api";
import type { Appointment } from "@/features/appointments/types/appointment.types";

export interface CheckoutQueueQuery {
  branchId?: string;
  date?: string;
}

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

export const normalizeAppliedDiscount = (rawInput: unknown): AppliedDiscount => {
  const raw = (typeof rawInput === "object" && rawInput !== null ? rawInput : {}) as Record<string, unknown>;
  const id = toFlatId(raw._id || raw.id || raw.discountId);
  const level = (raw.discountLevel || raw.level || "invoice") as AppliedDiscount["level"];
  const type = (raw.discountType || raw.type || "fixed") as AppliedDiscount["type"];
  const enteredValue = typeof raw.enteredValue === "number" ? raw.enteredValue : Number(raw.enteredValue) || 0;
  const calculatedDiscount =
    typeof raw.calculatedDiscount === "number"
      ? raw.calculatedDiscount
      : typeof raw.amount === "number"
      ? raw.amount
      : typeof raw.calculatedAmount === "number"
      ? raw.calculatedAmount
      : enteredValue;

  const rawLineIds = Array.isArray(raw.lineIds)
    ? raw.lineIds.map((lid) => toFlatId(lid))
    : undefined;

  return {
    id,
    _id: id,
    discountId: id,
    level,
    discountLevel: level,
    type,
    discountType: type,
    lineId: raw.lineId ? toFlatId(raw.lineId) : null,
    lineIds: rawLineIds,
    name: typeof raw.name === "string" ? raw.name : undefined,
    enteredValue,
    calculatedDiscount,
    amount: calculatedDiscount,
    reason: typeof raw.reason === "string" ? raw.reason : "",
    appliedBy: raw.appliedBy ? toFlatId(raw.appliedBy) : undefined,
    appliedAt: typeof raw.appliedAt === "string" ? raw.appliedAt : undefined,
  };
};

export const normalizeDiscountHistoryEntry = (rawInput: unknown): DiscountHistoryEntry => {
  const raw = (typeof rawInput === "object" && rawInput !== null ? rawInput : {}) as Record<string, unknown>;
  const id = toFlatId(raw.historyId || raw._id || raw.id);
  const discountLevel = (raw.discountLevel || raw.level || "invoice") as DiscountHistoryEntry["discountLevel"];
  const discountType = (raw.discountType || raw.type || "fixed") as DiscountHistoryEntry["discountType"];

  let performedBy: DiscountHistoryEntry["performedBy"] = "System";
  if (typeof raw.performedBy === "object" && raw.performedBy !== null) {
    const p = raw.performedBy as Record<string, unknown>;
    performedBy = {
      id: toFlatId(p._id || p.id),
      name: (p.name as string) || "Staff",
      email: (p.email as string) || undefined,
    };
  } else if (typeof raw.performedBy === "string") {
    performedBy = raw.performedBy;
  }

  const rawBefore = raw.beforeSnapshot || raw.snapshotBefore;
  const rawAfter = raw.afterSnapshot || raw.snapshotAfter;

  const rawLineIds = Array.isArray(raw.lineIds)
    ? raw.lineIds.map((lid) => toFlatId(lid))
    : undefined;

  const rawAllocations = Array.isArray(raw.allocations)
    ? raw.allocations.map((alloc: Record<string, unknown>) => ({
        lineId: toFlatId(alloc.lineId),
        lineName: typeof alloc.lineName === "string" ? alloc.lineName : undefined,
        allocatedAmount: typeof alloc.allocatedAmount === "number" ? alloc.allocatedAmount : 0,
      }))
    : undefined;

  return {
    id,
    _id: id,
    invoiceId: toFlatId(raw.invoiceId),
    discountId: toFlatId(raw.discountId),
    action: (raw.action as DiscountHistoryEntry["action"]) || "applied",
    discountLevel,
    discountType,
    lineId: raw.lineId ? toFlatId(raw.lineId) : null,
    lineIds: rawLineIds,
    lineName: typeof raw.lineName === "string" ? raw.lineName : undefined,
    allocations: rawAllocations,
    name: typeof raw.name === "string" ? raw.name : undefined,
    enteredValue: typeof raw.enteredValue === "number" ? raw.enteredValue : Number(raw.enteredValue) || 0,
    calculatedDiscount:
      typeof raw.calculatedDiscount === "number"
        ? raw.calculatedDiscount
        : typeof raw.calculatedAmount === "number"
        ? raw.calculatedAmount
        : typeof raw.amount === "number"
        ? raw.amount
        : 0,
    reason: typeof raw.reason === "string" ? raw.reason : "",
    performedBy,
    performedAt: (raw.performedAt as string) || (raw.createdAt as string) || new Date().toISOString(),
    beforeSnapshot: rawBefore as DiscountHistoryEntry["beforeSnapshot"],
    afterSnapshot: rawAfter as DiscountHistoryEntry["afterSnapshot"],
  };
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
    const rawAppliedSub = item.appliedSubscriptionId ? toFlatId(item.appliedSubscriptionId) : null;
    const isCovered =
      Boolean(item.isCoveredBySubscription) ||
      Boolean(item.isRedeemedViaSubscription) ||
      Boolean(rawAppliedSub);

    const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : Number(item.price) || 0;
    const quantity = typeof item.quantity === "number" ? item.quantity : 1;
    const lineTotal = typeof item.lineTotal === "number" ? item.lineTotal : unitPrice * quantity;

    // If item has an applied subscription but backend returned 0 for subscriptionCoveredAmount, resolve it from unitPrice
    let subCoveredAmount =
      typeof item.subscriptionCoveredAmount === "number" ? item.subscriptionCoveredAmount : 0;
    if (isCovered && subCoveredAmount === 0) {
      subCoveredAmount = lineTotal;
    }

    const calculatedPayable = Math.max(0, lineTotal - subCoveredAmount);
    const customerPayable =
      typeof item.customerPayable === "number" && !isCovered
        ? item.customerPayable
        : calculatedPayable;

    const appliedDiscounts = Array.isArray(item.appliedDiscounts)
      ? item.appliedDiscounts.map(normalizeAppliedDiscount)
      : undefined;

    return {
      id: toFlatId(item._id || item.id),
      serviceId: toFlatId(item.serviceId),
      serviceName: srvName,
      name: srvName,
      duration: typeof item.duration === "number" ? item.duration : undefined,
      unitPrice,
      quantity,
      lineTotal,
      isCoveredBySubscription: isCovered,
      isRedeemedViaSubscription: isCovered,
      appliedSubscriptionId: rawAppliedSub,
      subscriptionCode: typeof item.subscriptionCode === "string" ? item.subscriptionCode : null,
      subscriptionPlanName: typeof item.subscriptionPlanName === "string" ? item.subscriptionPlanName : null,
      subscriptionUsageId: item.subscriptionUsageId ? toFlatId(item.subscriptionUsageId) : null,
      subscriptionCoveredAmount: subCoveredAmount,
      customerPayable,
      appliedDiscounts,
      discountTotal: typeof item.discountTotal === "number" ? item.discountTotal : undefined,
    };
  });

  const rawSubtotal = typeof raw.subtotal === "number" ? raw.subtotal : 0;
  const rawDiscount = typeof raw.discountTotal === "number" ? raw.discountTotal : 0;
  const rawGross = typeof raw.grossPayable === "number" ? raw.grossPayable : Math.max(0, rawSubtotal - rawDiscount);

  // If top-level subscriptionCoveredAmount is 0 or missing, calculate sum of line-level subscription coverage
  const lineSubscriptionCoverage = items.reduce(
    (sum, item) => sum + (item.subscriptionCoveredAmount || 0),
    0,
  );
  const resolvedSubscriptionCovered =
    typeof raw.subscriptionCoveredAmount === "number" && raw.subscriptionCoveredAmount > 0
      ? raw.subscriptionCoveredAmount
      : lineSubscriptionCoverage;

  // Resolve payableAmount: if raw.payableAmount equals raw.grossPayable or raw.subtotal but subscription coverage exists, deduct it
  let resolvedPayable = typeof raw.payableAmount === "number" ? raw.payableAmount : 0;
  if (resolvedSubscriptionCovered > 0) {
    if (resolvedPayable === 0 || resolvedPayable >= rawGross) {
      resolvedPayable = Math.max(0, rawGross - resolvedSubscriptionCovered);
    }
  }

  const resolvedAmountPaid = typeof raw.amountPaid === "number" ? raw.amountPaid : 0;
  const resolvedAmountDue =
    typeof raw.amountDue === "number" && raw.amountDue !== (typeof raw.payableAmount === "number" ? raw.payableAmount : 0)
      ? raw.amountDue
      : Math.max(0, resolvedPayable - resolvedAmountPaid);

  return {
    id,
    invoiceNumber: (raw.invoiceNumber as string) || (id ? `#INV-${id.slice(-6).toUpperCase()}` : ""),
    organizationId,
    branchId,
    customerId,
    appointmentId,
    appointmentCode: directAppointmentCode,
    invoiceType:
      typeof raw.invoiceType === "string"
        ? (raw.invoiceType as Invoice["invoiceType"])
        : typeof raw.type === "string"
        ? (raw.type as Invoice["invoiceType"])
        : "service",
    status: (raw.status as Invoice["status"]) || "draft",
    paymentStatus: (raw.paymentStatus as Invoice["paymentStatus"]) || "unpaid",
    items,
    lines: items,
    subtotal: rawSubtotal,
    lineDiscountsTotal: typeof raw.lineDiscountsTotal === "number" ? raw.lineDiscountsTotal : undefined,
    invoiceDiscountsTotal: typeof raw.invoiceDiscountsTotal === "number" ? raw.invoiceDiscountsTotal : undefined,
    discountTotal: rawDiscount,
    grossPayable: rawGross,
    subscriptionCoveredAmount: resolvedSubscriptionCovered,
    appliedDiscounts: (() => {
      const topLevelDiscounts = Array.isArray(raw.appliedDiscounts)
        ? raw.appliedDiscounts.map(normalizeAppliedDiscount)
        : [];
      const lineLevelDiscounts = items.flatMap((item) => item.appliedDiscounts || []);

      // Deduplicate discounts while strictly preserving the chronological order of application
      const discountMap = new Map<string, AppliedDiscount>();
      for (const d of [...topLevelDiscounts, ...lineLevelDiscounts]) {
        if (d.id && !discountMap.has(d.id)) {
          discountMap.set(d.id, d);
        }
      }

      if (discountMap.size === 0) return undefined;
      const list = Array.from(discountMap.values());

      // If appliedAt timestamp is available, sort chronologically so order matches application history
      const hasTimestamps = list.some((d) => Boolean(d.appliedAt));
      if (hasTimestamps) {
        list.sort((a, b) => {
          if (!a.appliedAt) return 1;
          if (!b.appliedAt) return -1;
          return new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
        });
      }

      return list;
    })(),
    redeemLoyaltyPoints:
      typeof raw.redeemLoyaltyPoints === "number"
        ? raw.redeemLoyaltyPoints
        : typeof raw.loyaltyRedeemedPoints === "number"
        ? raw.loyaltyRedeemedPoints
        : typeof raw.loyaltyPointsRedeemed === "number"
        ? raw.loyaltyPointsRedeemed
        : undefined,
    loyaltyRedeemedPoints:
      typeof raw.loyaltyRedeemedPoints === "number"
        ? raw.loyaltyRedeemedPoints
        : typeof raw.redeemLoyaltyPoints === "number"
        ? raw.redeemLoyaltyPoints
        : typeof raw.loyaltyPointsRedeemed === "number"
        ? raw.loyaltyPointsRedeemed
        : undefined,
    loyaltyDiscountAmount:
      typeof raw.loyaltyDiscountAmount === "number"
        ? raw.loyaltyDiscountAmount
        : typeof raw.loyaltyDiscount === "number"
        ? raw.loyaltyDiscount
        : undefined,
    loyaltyPointsEarned:
      typeof raw.loyaltyPointsEarned === "number" ? raw.loyaltyPointsEarned : undefined,
    payableAmount: resolvedPayable,
    amountPaid: resolvedAmountPaid,
    amountDue: resolvedAmountDue,
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
    ...(s.totalPlanWaived !== undefined ? { totalPlanWaived: toSafeNum(s.totalPlanWaived) } : {}),
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
 * Fetch server-authoritative POS checkout queue (unbilled in_progress & completed appointments)
 */
export async function getCheckoutQueue(query: CheckoutQueueQuery = {}): Promise<Appointment[]> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>(
    "/billing/checkout-queue",
    {
      params: query,
      branchScope: query.branchId ? { type: "branch", branchId: query.branchId } : "current",
    }
  );

  return (data.data || []).map((raw) => {
    const apt = normalizeAppointment(raw);
    if (!apt.branchId && query.branchId) {
      apt.branchId = query.branchId;
    }
    return apt;
  });
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
 * Backend contract expects `discount` on POST /billing/invoices (strips unknown fields like discountTotal).
 */
export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const { discountTotal, ...rest } = payload;
  const backendPayload = {
    ...rest,
    ...(discountTotal !== undefined ? { discount: discountTotal } : {}),
  };

  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    "/billing/invoices",
    backendPayload,
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
      branchScope: payload.branchId
        ? { type: "branch", branchId: payload.branchId }
        : "current",
    }
  );

  return normalizeInvoice(data.data);
}

/**
 * Finalize an invoice. Financial figures become immutable.
 */
export async function finalizeInvoice(
  id: string,
  branchId?: string
): Promise<Invoice> {
  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/billing/invoices/${id}/finalize`,
    {},
    {
      branchScope: branchId
        ? { type: "branch", branchId }
        : "current",
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
      branchScope: payload.branchId
        ? { type: "branch", branchId: payload.branchId }
        : "current",
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
      branchScope: payload.branchId
        ? { type: "branch", branchId: payload.branchId }
        : "current",
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
      branchScope: payload.branchId
        ? { type: "branch", branchId: payload.branchId }
        : "current",
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
  action: "open" | "download" = "open",
  branchId?: string
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/billing/invoices/${invoiceId}/pdf`,
    {
      responseType: "blob",
      branchScope: branchId
        ? { type: "branch", branchId }
        : "current",
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

/**
 * Apply a line-level or invoice-level discount to a draft invoice.
 * POST /billing/invoices/:id/discounts
 */
export async function applyInvoiceDiscount(
  invoiceId: string,
  payload: ApplyDiscountPayload
): Promise<InvoiceDiscountMutationResult> {
  const { data } = await apiClient.post<ApiResponse<{
    invoice?: Record<string, unknown>;
    historyEntry?: Record<string, unknown>;
  } | Record<string, unknown>>>(
    `/billing/invoices/${invoiceId}/discounts`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );

  const rawData = data.data || {};
  const rawInvoice =
    "invoice" in rawData && rawData.invoice && typeof rawData.invoice === "object"
      ? (rawData.invoice as Record<string, unknown>)
      : rawData;

  const rawHistory =
    "historyEntry" in rawData && rawData.historyEntry && typeof rawData.historyEntry === "object"
      ? rawData.historyEntry
      : undefined;

  return {
    invoice: normalizeInvoice(rawInvoice),
    historyEntry: rawHistory ? normalizeDiscountHistoryEntry(rawHistory) : undefined,
  };
}

/**
 * Modify an existing discount value on a draft invoice.
 * PATCH /billing/invoices/:id/discounts/:discountId
 */
export async function modifyInvoiceDiscount(
  invoiceId: string,
  discountId: string,
  payload: ModifyDiscountPayload
): Promise<InvoiceDiscountMutationResult> {
  const { data } = await apiClient.patch<ApiResponse<{
    invoice?: Record<string, unknown>;
    historyEntry?: Record<string, unknown>;
  } | Record<string, unknown>>>(
    `/billing/invoices/${invoiceId}/discounts/${discountId}`,
    payload,
    {
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );

  const rawData = data.data || {};
  const rawInvoice =
    "invoice" in rawData && rawData.invoice && typeof rawData.invoice === "object"
      ? (rawData.invoice as Record<string, unknown>)
      : rawData;

  const rawHistory =
    "historyEntry" in rawData && rawData.historyEntry && typeof rawData.historyEntry === "object"
      ? rawData.historyEntry
      : undefined;

  return {
    invoice: normalizeInvoice(rawInvoice),
    historyEntry: rawHistory ? normalizeDiscountHistoryEntry(rawHistory) : undefined,
  };
}

/**
 * Remove an existing discount from a draft invoice.
 * DELETE /billing/invoices/:id/discounts/:discountId
 */
export async function removeInvoiceDiscount(
  invoiceId: string,
  discountId: string,
  payload: RemoveDiscountPayload
): Promise<InvoiceDiscountMutationResult> {
  const { data } = await apiClient.delete<ApiResponse<{
    invoice?: Record<string, unknown>;
    historyEntry?: Record<string, unknown>;
  } | Record<string, unknown>>>(
    `/billing/invoices/${invoiceId}/discounts/${discountId}`,
    {
      data: payload,
      branchScope: { type: "branch", branchId: payload.branchId },
    }
  );

  const rawData = data.data || {};
  const rawInvoice =
    "invoice" in rawData && rawData.invoice && typeof rawData.invoice === "object"
      ? (rawData.invoice as Record<string, unknown>)
      : rawData;

  const rawHistory =
    "historyEntry" in rawData && rawData.historyEntry && typeof rawData.historyEntry === "object"
      ? rawData.historyEntry
      : undefined;

  return {
    invoice: normalizeInvoice(rawInvoice),
    historyEntry: rawHistory ? normalizeDiscountHistoryEntry(rawHistory) : undefined,
  };
}

/**
 * Fetch discount audit history for an invoice.
 * GET /billing/invoices/:id/discount-history
 */
export async function getInvoiceDiscountHistory(
  invoiceId: string,
  branchId?: string
): Promise<DiscountHistoryEntry[]> {
  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>[]>>(
    `/billing/invoices/${invoiceId}/discount-history`,
    {
      branchScope: branchId
        ? { type: "branch", branchId }
        : "current",
    }
  );

  return (data.data || []).map(normalizeDiscountHistoryEntry);
}


