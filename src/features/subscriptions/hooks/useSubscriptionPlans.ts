import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionPlansApi } from "../api/plans.api";
import type {
  GetSubscriptionPlansParams,
  CreateSubscriptionPlanPayload,
  UpdateSubscriptionPlanPayload,
} from "../types/plan.types";

export const SUBSCRIPTION_PLANS_QUERY_KEY = ["subscription-plans"] as const;

export function useSubscriptionPlans(params?: GetSubscriptionPlansParams) {
  return useQuery({
    queryKey: [...SUBSCRIPTION_PLANS_QUERY_KEY, params],
    queryFn: () => subscriptionPlansApi.getPlans(params),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useSubscriptionPlan(id: string | undefined) {
  return useQuery({
    queryKey: [...SUBSCRIPTION_PLANS_QUERY_KEY, id],
    queryFn: () => {
      if (!id) throw new Error("Plan ID is required");
      return subscriptionPlansApi.getPlanById(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSubscriptionPlanPayload) =>
      subscriptionPlansApi.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_PLANS_QUERY_KEY });
    },
  });
}

export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSubscriptionPlanPayload }) =>
      subscriptionPlansApi.updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_PLANS_QUERY_KEY });
    },
  });
}

export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionPlansApi.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_PLANS_QUERY_KEY });
    },
  });
}
