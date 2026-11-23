import { useMutation, useQueryClient } from "@tanstack/react-query";
import { broadcastCrossTabInvalidation } from "@/lib/api/crossTabSync";
import { financeApi } from "../api/finance.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useApproveDayClosure() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, managerNotes }: { id: string; managerNotes?: string }) =>
      financeApi.approveDayClosure(id, managerNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("day-closures") });
      broadcastCrossTabInvalidation("finance");
    },
  });
}
