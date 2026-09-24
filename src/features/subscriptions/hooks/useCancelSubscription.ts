import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelSubscription } from "../api/subscriptions.api";
import type { CancelSubscriptionPayload } from "../types/subscription.types";

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CancelSubscriptionPayload }) =>
      cancelSubscription(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "detail", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "list"],
      });
    },
  });
}
