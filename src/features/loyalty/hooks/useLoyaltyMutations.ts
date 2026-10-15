import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateLoyaltyProgram,
  adjustCustomerLoyaltyPoints,
} from "../api/loyalty.api";
import type {
  LoyaltyProgramConfig,
  LoyaltyAdjustmentPayload,
} from "../types/loyalty.types";

export function useUpdateLoyaltyProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<LoyaltyProgramConfig>) => updateLoyaltyProgram(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "loyalty-program",
      });
    },
  });
}


export function useAdjustCustomerLoyaltyPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
    }: {
      customerId: string;
      payload: LoyaltyAdjustmentPayload;
    }) => adjustCustomerLoyaltyPoints(customerId, payload),
    onSuccess: (_data, variables) => {
      // Invalidate customer profile and loyalty ledger queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            (key === "customers" ||
              key === "customer" ||
              key === "loyalty-ledger") &&
            (query.queryKey.includes(variables.customerId) ||
              query.queryKey.some(
                (k) => Array.isArray(k) && k.includes(variables.customerId)
              ) ||
              key === "customers")
          );
        },
      });
    },
  });
}
