import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../api/users.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { CreateUserPayload } from "../types/users.types";

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { currentBranchId, getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => {
      // In unisex parlour, user creation context should be under a branch (or org wide check)
      return createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("users") });
    },
  });
}
