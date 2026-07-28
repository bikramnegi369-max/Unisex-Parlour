import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCustomer } from "../api/customers.api";

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: (_, id) => {
      // Invalidate both directory and detail views for this customer
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "customer" && query.queryKey.includes(id),
      });
    },
  });
}
