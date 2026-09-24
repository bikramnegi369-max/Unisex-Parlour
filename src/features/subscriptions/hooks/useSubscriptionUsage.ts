import { useQuery } from "@tanstack/react-query";
import { getSubscriptionUsage } from "../api/subscriptions.api";
import type { GetSubscriptionUsageParams } from "../types/subscription.types";

export function useSubscriptionUsage(
  id: string,
  params: GetSubscriptionUsageParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["subscriptions", "usage", id, params],
    queryFn: () => getSubscriptionUsage(id, params),
    enabled: !!id && options?.enabled !== false,
  });
}
