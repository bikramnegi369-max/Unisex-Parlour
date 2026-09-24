import type { ApiResponse, PaginatedResponse } from "@/types/api.types";

export interface PlanEntitlement {
  serviceId: string;
  serviceName?: string;
  quantity: number;
}

export interface SubscriptionPlan {
  id: string;
  _id?: string;
  organizationId: string;
  name: string;
  description?: string;
  suggestedPrice: number;
  validityMonths: number;
  entitlements: PlanEntitlement[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionPlanPayload {
  name: string;
  description?: string;
  suggestedPrice: number;
  validityMonths: number;
  entitlements: Array<{ serviceId: string; quantity: number }>;
  isActive?: boolean;
}

export interface UpdateSubscriptionPlanPayload {
  name?: string;
  description?: string;
  suggestedPrice?: number;
  validityMonths?: number;
  entitlements?: Array<{ serviceId: string; quantity: number }>;
  isActive?: boolean;
}

export interface GetSubscriptionPlansParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export type SubscriptionPlanListResponse = PaginatedResponse<SubscriptionPlan>;
export type SubscriptionPlanDetailsResponse = ApiResponse<SubscriptionPlan>;
export type SubscriptionPlanMutateResponse = ApiResponse<SubscriptionPlan>;
