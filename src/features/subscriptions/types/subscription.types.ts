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
  | "suspended"
  | "inactive";

export interface SubscriptionMember {
  customerId: string;
  customer?: SubscriptionCustomerSummary;
  status?: SubscriptionMemberStatus;
  entitlements: SubscriptionEntitlement[];
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
  billImmediately?: boolean;
}

export interface UpdateSubscriptionPayload {
  permittedBranchIds?: string[];
  endDate?: string;
  notes?: string;
}

export interface CancelSubscriptionPayload {
  reason: string;
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

export type SubscriptionListResponse = PaginatedResponse<Subscription>;
export type SubscriptionDetailsResponse = ApiResponse<Subscription>;
export type SubscriptionMutateResponse = ApiResponse<
  Subscription | { subscription: Subscription; invoiceId?: string; invoice?: Record<string, unknown> }
>;
export type SubscriptionUsageResponse = PaginatedResponse<SubscriptionUsageRecord>;
export type SendOtpResponse = ApiResponse<{ message?: string }>;
export type RedeemResponse = ApiResponse<{
  subscription: Subscription;
  usageRecords: SubscriptionUsageRecord[];
}>;

