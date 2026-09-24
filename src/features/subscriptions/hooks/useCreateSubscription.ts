import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubscription } from "../api/subscriptions.api";
import type { CreateSubscriptionPayload } from "../types/subscription.types";

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSubscriptionPayload) => createSubscription(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "list"],
      });
    },
  });
}
