import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export type SubscriptionStatus =
  | "active"
  | "pending_payment"
  | "expired"
  | "exhausted"
  | "cancelled";

export interface SubscriptionCustomerSummary {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface SubscriptionEntitlement {
  serviceId: string;
  serviceName?: string;
  totalQuantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  isRedeemable?: boolean;
}

export interface SubscriptionPlanSummary {
  _id?: string;
  id?: string;
  name: string;
}

export type SubscriptionMemberStatus =
  | "active"
  | "pending_payment"
  | "exhausted"
  | "cancelled";

export interface SubscriptionMember {
  customerId: string;
  customer?: SubscriptionCustomerSummary;
  status?: SubscriptionMemberStatus;
  entitlements: SubscriptionEntitlement[];
  permittedBranchIds?: string[];
  joinedAt?: string;
  notes?: string;
}

export interface Subscription {
  id: string;
  _id?: string;
  organizationId: string;
  planId?: string | SubscriptionPlanSummary;
  // Payer customer (purchased and owns invoice)
  customerId: string;
  customer?: SubscriptionCustomerSummary;
  payerCustomerId?: string;
  payerId?: string;
  payer?: SubscriptionCustomerSummary;
  // Multi-customer beneficiary members
  members?: SubscriptionMember[];
  subscriptionCode: string;
  price: number;
  // Legacy / top-level aggregated entitlements
  entitlements: SubscriptionEntitlement[];
  permittedBranchIds: string[];
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  paymentStatus?: "unpaid" | "partially_paid" | "paid";
  invoiceId?: string;
  invoiceNumber?: string;
  amountPaid?: number;
  amountDue?: number;
  isPaid?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsageRecord {
  id: string;
  _id?: string;
  subscriptionId: string;
  serviceId: string;
  serviceName?: string;
  memberCustomerId?: string;
  memberCustomer?: SubscriptionCustomerSummary;
  quantity: number;
  branchId: string;
  branchName?: string;
  appointmentId?: string;
  subscriptionInvoice?: {
    id?: string;
    _id?: string;
    invoiceNumber?: string;
    status?: string;
    paymentStatus?: string;
  } | string;
  verificationMethod?: "otp" | "manual";
  reason?: string | null;
  redeemedAt: string;
  verifiedBy?: { id?: string; _id?: string; name: string } | string;
  redeemedBy?: { id?: string; _id?: string; name: string } | string;
}

export interface MemberEntitlementPayload {
  serviceId: string;
  quantity: number;
}

export interface SubscriptionMemberPayload {
  customerId: string;
  permittedBranchIds?: string[];
  entitlements: MemberEntitlementPayload[];
  notes?: string;
}

export interface CreateSubscriptionPayload {
  // Payer identification: payerCustomerId is canonical for multi-member, customerId supported for legacy
  payerCustomerId?: string;
  customerId?: string;
  payerId?: string;
  planId?: string;
  price: number;
  // Either multi-member structure or single customer entitlements
  members?: SubscriptionMemberPayload[];
  entitlements?: MemberEntitlementPayload[];
  permittedBranchIds?: string[];
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface UpdateSubscriptionPayload {
  permittedBranchIds?: string[];
  endDate?: string;
  notes?: string;
}

export interface UpdateMemberBranchAccessPayload {
  permittedBranchIds: string[];
}

export interface CancelSubscriptionPayload {
  reason: string;
  forceAsync?: boolean;
  idempotencyKey?: string;
}

export interface RawAffectedLineDTO {
  usageId?: string;
  appointmentId?: string;
  appointmentCode?: string;
  appointmentStatus?: string;
  serviceId?: string;
  serviceName?: string;
  restoredPrice?: number;
  appointmentServiceId?: string;
  // Fallback alias
  restoredRetailPrice?: number;
}

export interface RawAffectedAppointmentDTO {
  appointmentId?: string;
  appointmentCode?: string;
  status?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  currentAmountPaid?: number;
  currentAmountDue?: number;
  affectedLines?: RawAffectedLineDTO[];
  // Fallback aliases
  serviceLinesToRebill?: RawAffectedLineDTO[];
}

export interface RawCancellationPreviewDTO {
  subscriptionId?: string;
  subscriptionCode?: string;
  status?: string;
  isEligibleRuleB?: boolean;
  isEligible?: boolean;
  isPaid?: boolean;
  totalCollected?: number;
  totalUsages?: number;
  totalAppointments?: number;
  totalRestoredAmount?: number;
  expectedRebilledSubtotalIncrease?: number;
  consumedEntitlementCount?: number;
  affectedAppointmentCount?: number;
  eligibilityRule?: "RULE_A" | "RULE_B" | string;
  ineligibilityReason?: string;
  blockingInconsistencies?: Array<string | { message?: string; [key: string]: unknown }>;
  breakdown?: {
    pendingAppointments?: number;
    completedAppointments?: number;
    otherAppointments?: number;
  };
  affectedAppointments?: RawAffectedAppointmentDTO[];
}

export interface ServiceLineToRebill {
  usageId?: string;
  appointmentServiceId?: string;
  serviceId: string;
  serviceName: string;
  restoredRetailPrice: number;
}

export interface AffectedAppointmentPreview {
  appointmentId: string;
  appointmentCode?: string;
  status: "scheduled" | "in_progress" | "completed" | string;
  invoiceId?: string;
  invoiceNumber?: string;
  currentAmountPaid?: number;
  currentAmountDue?: number;
  serviceLinesToRebill: ServiceLineToRebill[];
}

export interface CancellationPreviewData {
  subscriptionId: string;
  subscriptionCode: string;
  status: string;
  isPaid: boolean;
  isEligible: boolean;
  eligibilityRule: "RULE_A" | "RULE_B" | string;
  ineligibilityReason?: string;
  blockingInconsistencies?: string[];
  totalCollected: number;
  consumedEntitlementCount: number;
  affectedAppointmentCount: number;
  expectedRebilledSubtotalIncrease: number;
  totalRestoredAmount?: number;
  breakdown?: {
    pendingAppointments?: number;
    completedAppointments?: number;
    otherAppointments?: number;
  };
  affectedAppointments: AffectedAppointmentPreview[];
}

export type CancellationOperationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "requires_reconciliation"
  | string;

export interface CancellationOperationProgress {
  // Primary backend schema fields
  totalUsageCount?: number;
  totalAppointmentCount?: number;
  processedUsageCount?: number;
  processedAppointmentCount?: number;
  completedBatchIndexes?: number[];
  operationErrors?: Array<{ message: string; recordId?: string }>;
  // Friendly frontend-normalized aliases
  totalAppointments?: number;
  processedAppointments?: number;
  successfulAppointments?: number;
  failedAppointments?: number;
  totalServiceLines?: number;
  processedServiceLines?: number;
}

export interface CancellationOperationData {
  operationId: string;
  subscriptionId: string;
  subscriptionCode?: string;
  status: CancellationOperationStatus;
  progress?: CancellationOperationProgress;
  // Primary backend status & error fields
  totalUsageCount?: number;
  totalAppointmentCount?: number;
  processedUsageCount?: number;
  processedAppointmentCount?: number;
  completedBatchIndexes?: number[];
  operationErrors?: Array<{ message: string; recordId?: string }>;
  errorMessage?: string;
  failureReason?: string;
  affectedAppointmentIds?: string[];
  affectedInvoiceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface CancelSubscriptionResponseData {
  subscription?: Subscription;
  operationId?: string;
  status?: string;
  isAsync?: boolean;
  operation?: CancellationOperationData;
}

export interface RedeemServiceItem {
  serviceId: string;
  quantity: number;
}

export interface RedeemSubscriptionPayload {
  otp?: string;
  isManual?: boolean;
  reason?: string;
  idempotencyKey?: string;
  services: RedeemServiceItem[];
  appointmentId?: string;
  memberCustomerId?: string;
}

export interface GetSubscriptionsParams {
  page?: number;
  limit?: number;
  customerId?: string;
  payerId?: string;
  memberId?: string;
  status?: string;
  branchId?: string;
  search?: string;
}

export interface GetSubscriptionUsageParams {
  page?: number;
  limit?: number;
}

export interface CreateSubscriptionResult extends Subscription {
  invoice?: import("@/features/billing/types/billing.types").Invoice;
  invoiceId?: string;
  invoiceNumber?: string;
}

export interface RenewSubscriptionPayload {
  endDate?: string;
  price?: number;
  notes?: string;
}

export interface RenewSubscriptionResult extends Subscription {
  invoice?: import("@/features/billing/types/billing.types").Invoice;
  invoiceId?: string;
  invoiceNumber?: string;
}

export interface SendOtpPayload {
  memberCustomerId?: string;
}

export interface SendOtpResult {
  message?: string;
  expiresIn?: number;
  resendAfter?: number;
}

export type SubscriptionListResponse = PaginatedResponse<Subscription>;
export type SubscriptionDetailsResponse = ApiResponse<Subscription>;
export type SubscriptionMutateResponse = ApiResponse<
  Subscription | { subscription: Subscription; invoiceId?: string; invoice?: Record<string, unknown> }
>;
export type SubscriptionUsageResponse = PaginatedResponse<SubscriptionUsageRecord>;
export type SendOtpResponse = ApiResponse<SendOtpResult>;
export type RedeemResponse = ApiResponse<{
  subscription: Subscription;
  usageRecords: SubscriptionUsageRecord[];
}>;

