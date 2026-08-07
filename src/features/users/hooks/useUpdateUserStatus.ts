import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserStatus } from "../api/users.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import type { UpdateUserStatus } from "../types/users.types";

interface UpdateUserStatusParams {
  id: string;
  status: UpdateUserStatus;
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { getBranchQueryKey } = useBranchContext();

  return useMutation({
    mutationFn: ({ id, status }: UpdateUserStatusParams) => updateUserStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getBranchQueryKey("users") });
      queryClient.invalidateQueries({
        queryKey: getBranchQueryKey("user", [data.id]),
      });
    },
  });
}
