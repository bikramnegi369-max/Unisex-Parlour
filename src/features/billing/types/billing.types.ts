export type InvoiceStatus = "draft" | "finalized" | "cancelled";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid";

export type PaymentMethod = "cash" | "card" | "upi" | "other";

export type PaymentRecordStatus = "recorded" | "voided";

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
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  items: InvoiceLineItem[];
  lines?: InvoiceLineItem[];
  subtotal: number;
  discountTotal: number;
  grossPayable: number;
  subscriptionCoveredAmount: number;
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
}

export interface CreateInvoicePayload {
  branchId: string;
  appointmentId: string;
  discountTotal?: number;
  notes?: string;
}

export interface UpdateDraftInvoicePayload {
  discountTotal?: number;
  notes?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
}

export interface VoidPaymentPayload {
  reason: string;
}

export interface CancelInvoicePayload {
  reason?: string;
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
}

export interface InvoiceListResponseMeta {
  total: number;
  page: string | number;
  limit: string | number;
  totalPages: number;
  summary?: CustomerBillingSummary;
}
