import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { cancelSubscription, type CancelSubscriptionResult } from "../api/subscriptions.api";
import type { CancelSubscriptionPayload } from "../types/subscription.types";

interface CancelSubscriptionVariables {
  id: string;
  payload: CancelSubscriptionPayload;
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<CancelSubscriptionResult, Error, CancelSubscriptionVariables>({
    mutationFn: ({ id, payload }) => cancelSubscription(id, payload),
    onSuccess: (result, { id }) => {
      // Invalidate subscription preview cache
      queryClient.invalidateQueries({
        queryKey: ["subscriptions", "cancel-preview", id],
      });

      // If synchronous completion (HTTP 200), invalidate all related entity caches immediately
      if (!result.isAsync && result.status === "completed") {
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "detail", id],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "usage", id],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "list"],
        });

        // Invalidate appointments, calendars, and customer summaries
        queryClient.invalidateQueries({
          queryKey: ["appointments"],
        });
        queryClient.invalidateQueries({
          queryKey: ["invoices"],
        });
        queryClient.invalidateQueries({
          queryKey: ["customers"],
        });

        broadcastCrossTabInvalidation("subscriptions");
        broadcastCrossTabInvalidation("appointments");
        broadcastCrossTabInvalidation("invoices");
      }
    },
  });
}
