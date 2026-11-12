import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { SUBSCRIPTIONS_CONFIG } from "../config/subscriptions.config";
import { getCancellationOperation } from "../api/subscriptions.api";
import type { CancellationOperationData } from "../types/subscription.types";

export function useCancellationOperation(
  subscriptionId: string,
  operationId: string | null | undefined,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canConfigure = hasPermission(
    user,
    SUBSCRIPTIONS_CONFIG.permissions.configure,
  );
  // Track whether completion invalidation has already been executed for this operationId
  const invalidatedRef = useRef<string | null>(null);

  return useQuery<CancellationOperationData, Error>({
    queryKey: [
      "subscriptions",
      "cancel-operations",
      subscriptionId,
      operationId,
    ],
    queryFn: async () => {
      const data = await getCancellationOperation(subscriptionId, operationId!);
      // If the operation transitions to terminal completed, trigger full cache invalidation exactly once
      if (
        data.status === "completed" &&
        invalidatedRef.current !== operationId
      ) {
        invalidatedRef.current = operationId || null;
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "detail", subscriptionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "usage", subscriptionId],
        });
        queryClient.invalidateQueries({
          queryKey: ["subscriptions", "list"],
        });
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
      return data;
    },
    enabled:
      Boolean(options?.enabled ?? true) &&
      Boolean(subscriptionId) &&
      Boolean(operationId) &&
      canConfigure,
    refetchInterval: (query) => {
      // If caller explicitly passed a static interval or false, respect it
      if (options?.refetchInterval !== undefined) {
        return options.refetchInterval;
      }
      const data = query.state.data;
      if (!data) return 2000;
      // Stop polling for terminal states
      if (
        data.status === "completed" ||
        data.status === "failed" ||
        data.status === "requires_reconciliation"
      ) {
        return false;
      }
      return 2500;
    },
    refetchOnWindowFocus: true,
  });
}
