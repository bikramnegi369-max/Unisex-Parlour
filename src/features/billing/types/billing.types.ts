export type InvoiceStatus = "draft" | "finalized" | "cancelled";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

export type PaymentMethod = "cash" | "card" | "upi" | "other";

export type PaymentRecordStatus = "recorded" | "voided";

export type InvoiceType = "service" | "membership" | "subscription" | "package" | "retail" | "custom" | string;

export interface InvoiceCustomerSummary {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface InvoiceBranchSummary {
  id: string;
  name: string;
  timezone?: string;
}

export interface InvoiceAppointmentSummary {
  id: string;
  appointmentCode?: string;
  date?: string;
  startTime?: string;
}

export interface InvoiceLineItem {
  id?: string;
  _id?: string;
  serviceId: string;
  serviceName: string;
  name?: string;
  duration?: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isCoveredBySubscription?: boolean;
  isRedeemedViaSubscription?: boolean;
  appliedSubscriptionId?: string | null;
  subscriptionCode?: string | null;
  subscriptionPlanName?: string | null;
  subscriptionUsageId?: string | null;
  subscriptionCoveredAmount?: number;
  customerPayable?: number;
  appliedDiscounts?: AppliedDiscount[];
  discountTotal?: number;
}

export type DiscountLevel = "line" | "selected_lines" | "invoice";
export type DiscountType = "fixed" | "percentage";

export interface AppliedDiscount {
  id: string;
  _id?: string;
  discountId?: string;
  level: DiscountLevel;
  discountLevel?: DiscountLevel;
  type: DiscountType;
  discountType?: DiscountType;
  lineId?: string | null;
  lineIds?: string[];
  name?: string;
  enteredValue: number;
  calculatedDiscount: number;
  amount?: number;
  reason: string;
  appliedBy?: string;
  appliedAt?: string;
}

export interface FinancialSnapshot {
  subtotal: number;
  lineDiscountsTotal: number;
  invoiceDiscountsTotal: number;
  discountTotal: number;
  grossPayable: number;
  subscriptionCoveredAmount: number;
  payableAmount: number;
  amountPaid: number;
  amountDue: number;
}

export interface DiscountAllocation {
  lineId: string;
  lineName?: string;
  allocatedAmount: number;
}

export interface DiscountHistoryEntry {
  id: string;
  _id?: string;
  invoiceId: string;
  discountId: string;
  action: "applied" | "modified" | "removed";
  discountLevel: DiscountLevel;
  discountType: DiscountType;
  lineId?: string | null;
  lineIds?: string[];
  lineName?: string;
  allocations?: DiscountAllocation[];
  name?: string;
  enteredValue: number;
  calculatedDiscount: number;
  reason: string;
  performedBy: {
    id: string;
    name: string;
    email?: string;
  } | string;
  performedAt: string;
  beforeSnapshot?: FinancialSnapshot;
  afterSnapshot?: FinancialSnapshot;
}

export interface ApplyDiscountPayload {
  branchId: string;
  discountLevel: DiscountLevel;
  lineId?: string;
  lineIds?: string[];
  name?: string;
  discountType: DiscountType;
  enteredValue: number;
  reason: string;
}

export interface ModifyDiscountPayload {
  branchId: string;
  enteredValue: number;
  reason: string;
}

export interface RemoveDiscountPayload {
  branchId: string;
  reason: string;
}

export interface InvoiceDiscountMutationResult {
  invoice: Invoice;
  historyEntry?: DiscountHistoryEntry;
}

export interface Invoice {
  id: string;
  _id?: string;
  invoiceNumber: string;
  organizationId: string;
  branchId: string;
  customerId: string;
  appointmentId: string;
  appointmentCode?: string;
  invoiceType?: InvoiceType;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  items: InvoiceLineItem[];
  lines?: InvoiceLineItem[];
  subtotal: number;
  lineDiscountsTotal?: number;
  invoiceDiscountsTotal?: number;
  discountTotal: number;
  grossPayable: number;
  subscriptionCoveredAmount: number;
  appliedDiscounts?: AppliedDiscount[];
  redeemLoyaltyPoints?: number;
  loyaltyRedeemedPoints?: number;
  loyaltyDiscountAmount?: number;
  loyaltyPointsEarned?: number;
  payableAmount: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  finalizedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated optional associations
  customer?: InvoiceCustomerSummary;
  appointment?: InvoiceAppointmentSummary;
  branch?: InvoiceBranchSummary;
}

export interface PaymentRecord {
  id: string;
  _id?: string;
  paymentNumber: string;
  invoiceId: string;
  organizationId: string;
  branchId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  status: PaymentRecordStatus;
  paidAt: string;
  recordedBy?: {
    id: string;
    name: string;
    email?: string;
  } | string;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedBy?: {
    id: string;
    name: string;
    email?: string;
  } | string | null;
  createdAt: string;
  updatedAt: string;
  isIdempotentReplay?: boolean;
}

export interface CreateInvoicePayload {
  branchId: string;
  appointmentId: string;
  discountTotal?: number;
  redeemLoyaltyPoints?: number;
  notes?: string;
}

export interface UpdateDraftInvoicePayload {
  discountTotal?: number;
  redeemLoyaltyPoints?: number;
  notes?: string;
  branchId?: string;
}


export interface RecordPaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  idempotencyKey?: string;
  branchId?: string;
}

export interface VoidPaymentPayload {
  reason: string;
  branchId?: string;
}

export interface CancelInvoicePayload {
  reason?: string;
  branchId?: string;
}

export interface InvoiceListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  paymentStatus?: PaymentStatus;
  branchId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CustomerBillingSummary {
  totalInvoices: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalPlanWaived?: number;
}

export interface InvoiceListResponseMeta {
  total: number;
  page: string | number;
  limit: string | number;
  totalPages: number;
  summary?: CustomerBillingSummary;
}
