import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { expensesApi } from "../api/expenses.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useRejectExpense() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      expensesApi.rejectExpense(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("expenses") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("expenses-summary") });
      broadcastCrossTabInvalidation("expenses");
      broadcastCrossTabInvalidation("finance");
    },
  });
}
