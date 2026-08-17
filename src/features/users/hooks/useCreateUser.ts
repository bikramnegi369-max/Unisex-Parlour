import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "../api/users.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { CreateUserPayload } from "../types/users.types";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => {
      return createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("users", null) });
    },
  });
}
