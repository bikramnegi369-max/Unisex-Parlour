import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCustomer } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: (_, id) => {
      // Invalidate both directory and detail views for this customer
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("customers") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("customer", [id]),
      });
    },
  });
}

