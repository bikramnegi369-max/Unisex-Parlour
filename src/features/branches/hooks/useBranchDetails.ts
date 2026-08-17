"use client";

import { useQuery } from "@tanstack/react-query";
import { getBranch } from "../api/branches.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function useBranchDetails(branchId: string | null | undefined) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["branches", branchId],
    queryFn: () => getBranch(branchId!),
    enabled: isAuthenticated && Boolean(branchId),
    retry: false,
  });
}
