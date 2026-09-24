import { useQuery } from "@tanstack/react-query";
import { getSubscriptions } from "../api/subscriptions.api";
import type { GetSubscriptionsParams } from "../types/subscription.types";

export function useSubscriptions(
  params: GetSubscriptionsParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["subscriptions", "list", params],
    queryFn: () => getSubscriptions(params),
    enabled: options?.enabled !== false,
  });
}
