import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../api/customers.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { Customer } from "../types/customer.types";

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { currentBranchId } = useBranchContext();

  return useMutation({
    mutationFn: (payload: Omit<Partial<Customer>, "id" | "organizationId" | "homeBranchId" | "visitedBranchIds" | "isActive">) => {
      if (currentBranchId === null || currentBranchId === "all") {
        throw new Error("Select a specific branch to create a customer.");
      }
      return createCustomer(payload);
    },
    onSuccess: () => {
      // Invalidate all query caches starting with "customers"
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
