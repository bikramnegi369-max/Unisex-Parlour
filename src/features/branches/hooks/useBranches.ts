"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { setAvailableBranches, setOrganization, setCurrentBranch } from "@/store/slices/branchSlice";
import { getBranches } from "../api/branches.api";
import { getStoredBranchId } from "@/lib/branch/storage";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Branch, Organization } from "@/types/branch";

// ---------------------------------------------------------------------------
// Development mock — removed when backend is connected
// ---------------------------------------------------------------------------

const MOCK_BRANCHES: Branch[] = [
  { id: "branch-1", name: "Koramangala", organizationId: "org-1", address: "5th Block, Koramangala, Bengaluru", isActive: true },
  { id: "branch-2", name: "Indiranagar", organizationId: "org-1", address: "12th Main, Indiranagar, Bengaluru", isActive: true },
  { id: "branch-3", name: "Whitefield", organizationId: "org-1", address: "ITPL Road, Whitefield, Bengaluru", isActive: false },
];

const MOCK_ORGANIZATION: Organization = {
  id: "org-1",
  name: "Unisex Parlour",
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBranches() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const currentBranchId = useAppSelector((state) => state.branch.currentBranchId);

  const query = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      try {
        return await getBranches();
      } catch {
        // Fallback to mock data in development when backend is offline
        if (process.env.NODE_ENV === "development") {
          return { organization: MOCK_ORGANIZATION, branches: MOCK_BRANCHES };
        }
        throw new Error("Failed to load branches");
      }
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // branches rarely change — cache for 10 min
    retry: false,
  });

  // Populate Redux store when branches are fetched
  useEffect(() => {
    if (!query.data) return;

    dispatch(setOrganization(query.data.organization));
    dispatch(setAvailableBranches(query.data.branches));

    // Restore persisted branch selection, validate it is still accessible
    const storedId = getStoredBranchId();
    const isValid = storedId
      ? query.data.branches.some((b) => b.id === storedId && b.isActive)
      : false;

    if (isValid && storedId) {
      dispatch(setCurrentBranch(storedId));
    } else if (currentBranchId === null) {
      // Default: Owner stays on "All Branches"; others default to first active branch
      const firstActive = query.data.branches.find((b) => b.isActive);
      if (firstActive) {
        dispatch(setCurrentBranch(firstActive.id));
      }
    }
  }, [query.data, dispatch, currentBranchId]);

  return {
    branches: query.data?.branches ?? [],
    organization: query.data?.organization ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
