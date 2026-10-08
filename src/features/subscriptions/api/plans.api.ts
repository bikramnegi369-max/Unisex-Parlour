import { apiClient } from "@/lib/api/axios";
import type { ApiResponse } from "@/types/api.types";
import type {
  SubscriptionPlan,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
  GetSubscriptionPlansParams,
  SubscriptionPlanListResponse,
  SubscriptionPlanDetailsResponse,
  SubscriptionPlanMutateResponse,
} from "../types/plan.types";

export const subscriptionPlansApi = {
  getPlans: async (params?: GetSubscriptionPlansParams): Promise<SubscriptionPlanListResponse> => {
    const response = await apiClient.get<SubscriptionPlanListResponse>("/subscription-plans", {
      params,
      branchScope: "none",
    });
    return {
      ...response.data,
      data: (response.data.data || []).map((p: SubscriptionPlan) => ({
        ...p,
        id: p.id || p._id || "",
      })),
    };
  },

  getPlanById: async (id: string): Promise<SubscriptionPlanDetailsResponse> => {
    const response = await apiClient.get<SubscriptionPlanDetailsResponse>(`/subscription-plans/${id}`, {
      branchScope: "none",
    });
    const data = response.data.data;
    return {
      ...response.data,
      data: {
        ...data,
        id: data.id || data._id || "",
      },
    };
  },

  createPlan: async (payload: CreateSubscriptionPlanPayload): Promise<SubscriptionPlanMutateResponse> => {
    const response = await apiClient.post<SubscriptionPlanMutateResponse>("/subscription-plans", payload, {
      branchScope: "none",
    });
    const data = response.data.data;
    const normalized = {
      ...data,
      id: data.id || data._id || "",
    };
    return {
      ...response.data,
      data: normalized,
    };
  },

  updatePlan: async (id: string, payload: UpdateSubscriptionPlanPayload): Promise<SubscriptionPlanMutateResponse> => {
    const response = await apiClient.put<SubscriptionPlanMutateResponse>(`/subscription-plans/${id}`, payload, {
      branchScope: "none",
    });
    const data = response.data.data;
    const normalized = {
      ...data,
      id: data.id || data._id || "",
    };
    return {
      ...response.data,
      data: normalized,
    };
  },

  deletePlan: async (id: string): Promise<ApiResponse<{ message?: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ message?: string }>>(`/subscription-plans/${id}`, {
      branchScope: "none",
    });
    return response.data;
  },
};
