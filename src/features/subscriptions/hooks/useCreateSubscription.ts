import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubscription } from "../api/subscriptions.api";
import type { CreateSubscriptionPayload } from "../types/subscription.types";

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSubscriptionPayload) => createSubscription(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "subscriptions" ||
            key === "invoices" ||
            key === "invoice" ||
            key === "customers" ||
            key === "customer" ||
            key === "appointments" ||
            key === "appointment"
          );
        },
      });
    },
  });
}
