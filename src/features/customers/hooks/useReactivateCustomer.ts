import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reactivateCustomer } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useReactivateCustomer() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => reactivateCustomer(id),
    onSuccess: (_, id) => {
      // Invalidate both directory and detail views for this customer
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("customers") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer", [id]),
      });
    },
  });
}
