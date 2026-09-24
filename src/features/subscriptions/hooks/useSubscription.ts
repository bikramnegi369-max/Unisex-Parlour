import { useQuery } from "@tanstack/react-query";
import { getSubscription } from "../api/subscriptions.api";

export function useSubscription(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["subscriptions", "detail", id],
    queryFn: () => getSubscription(id),
    enabled: !!id && options?.enabled !== false,
  });
}
