import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export type SubscriptionStatus = "active" | "expired" | "exhausted" | "cancelled";

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
}

export interface Subscription {
  id: string;
  _id?: string;
  organizationId: string;
  customerId: string;
  customer?: SubscriptionCustomerSummary;
  subscriptionCode: string;
  price: number;
  entitlements: SubscriptionEntitlement[];
  permittedBranchIds: string[];
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
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
  quantity: number;
  branchId: string;
  branchName?: string;
  appointmentId?: string;
  redeemedAt: string;
  redeemedBy?: { id: string; name: string } | string;
}

export interface CreateSubscriptionPayload {
  customerId: string;
  price: number;
  entitlements: Array<{ serviceId: string; quantity: number }>;
  permittedBranchIds: string[];
  startDate: string;
  endDate: string;
  notes?: string;
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
  otp: string;
  services: RedeemServiceItem[];
  appointmentId?: string;
}

export interface GetSubscriptionsParams {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: string;
  branchId?: string;
  search?: string;
}

export interface GetSubscriptionUsageParams {
  page?: number;
  limit?: number;
}

export type SubscriptionListResponse = PaginatedResponse<Subscription>;
export type SubscriptionDetailsResponse = ApiResponse<Subscription>;
export type SubscriptionMutateResponse = ApiResponse<Subscription>;
export type SubscriptionUsageResponse = PaginatedResponse<SubscriptionUsageRecord>;
export type SendOtpResponse = ApiResponse<{ message?: string }>;
export type RedeemResponse = ApiResponse<{
  subscription: Subscription;
  usageRecords: SubscriptionUsageRecord[];
}>;
