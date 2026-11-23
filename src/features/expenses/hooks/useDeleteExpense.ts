import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { expensesApi } from "../api/expenses.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("expenses") });
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("expenses-summary") });
      broadcastCrossTabInvalidation("expenses");
      broadcastCrossTabInvalidation("finance");
    },
  });
}
