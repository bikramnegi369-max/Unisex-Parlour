import { useMutation, useQueryClient } from "@tanstack/react-query";
import { renewSubscription } from "../api/subscriptions.api";
import type { RenewSubscriptionPayload } from "../types/subscription.types";

export function useRenewSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RenewSubscriptionPayload }) =>
      renewSubscription(id, payload),
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
