import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubscription } from "../api/subscriptions.api";
import type { CreateSubscriptionPayload } from "../types/subscription.types";

export type CreateSubscriptionMutationInput =
  | CreateSubscriptionPayload
  | { payload: CreateSubscriptionPayload; branchId?: string };

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubscriptionMutationInput) => {
      if ("payload" in input && input.payload) {
        return createSubscription(input.payload, input.branchId);
      }
      return createSubscription(input as CreateSubscriptionPayload);
    },
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
