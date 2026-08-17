import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserStatus } from "../api/users.api";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import type { UpdateUserStatus } from "../types/users.types";

interface UpdateUserStatusParams {
  id: string;
  status: UpdateUserStatus;
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: UpdateUserStatusParams) => updateUserStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getScopeQueryKey("users", null) });
      queryClient.invalidateQueries({
        queryKey: getScopeQueryKey("user", null, [data.id]),
      });
    },
  });
}
