import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSubscription } from "../api/subscriptions.api";
import type { UpdateSubscriptionPayload } from "../types/subscription.types";

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSubscriptionPayload }) =>
      updateSubscription(id, payload),
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
