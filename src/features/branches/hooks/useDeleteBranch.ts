"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBranch } from "../api/branches.api";

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation<null, Error, string>({
    mutationFn: (branchId: string) => deleteBranch(branchId),
    onSuccess: (_, branchId) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branches", branchId] });
    },
  });
}
