import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { expensesApi } from "../api/expenses.api";
import { RecoverPayoutPayload } from "../types/expense.types";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useRecoverPettyCashPayout() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: RecoverPayoutPayload) => {
      if (!currentBranchId || currentBranchId === "all") {
        throw new Error("Select a specific branch to record cash recovery.");
      }
      const idempotencyKey = `recovery_${payload.originalPayoutId}_${Date.now()}`;
      return expensesApi.recoverPettyCashPayout(payload, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("petty-cash-balance") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("petty-cash-transactions") });
      broadcastCrossTabInvalidation("expenses");
      broadcastCrossTabInvalidation("finance");
    },
  });
}
