import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { expensesApi } from "../api/expenses.api";
import { ReplenishPettyCashPayload } from "../types/expense.types";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useReplenishPettyCash() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: ReplenishPettyCashPayload) => {
      if (!currentBranchId || currentBranchId === "all") {
        throw new Error("Select a specific branch to replenish the cash drawer.");
      }
      const idempotencyKey = `replenish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return expensesApi.replenishPettyCash(payload, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("petty-cash-balance") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("petty-cash-transactions") });
      broadcastCrossTabInvalidation("expenses");
      broadcastCrossTabInvalidation("finance");
    },
  });
}
