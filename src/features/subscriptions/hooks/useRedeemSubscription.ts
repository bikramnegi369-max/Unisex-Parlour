import { useMutation, useQueryClient } from "@tanstack/react-query";
import { redeemSubscription } from "../api/subscriptions.api";
import type { RedeemSubscriptionPayload } from "../types/subscription.types";

export function useRedeemSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RedeemSubscriptionPayload }) =>
      redeemSubscription(id, payload),
    onSuccess: (_, { id, payload }) => {
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "detail", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "usage", id],
      });
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "list"],
      });
      // Invalidate appointments if linked
      if (payload.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ["appointments"],
        });
        queryClient.invalidateQueries({
          queryKey: ["appointment", payload.appointmentId],
        });
      }
    },
  });
}
