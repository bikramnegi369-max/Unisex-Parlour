"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAppDispatch } from "@/hooks/store";
import { setAvailableBranches, setOrganization, setCurrentBranch } from "@/store/slices/branchSlice";
import { getBranches } from "../api/branches.api";
import { getStoredBranchId, removeStoredBranchId, setStoredBranchId } from "@/lib/branch/storage";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasOrgWideAccess, hasBranchAccess } from "@/lib/permissions";
import axios from "axios";

export function useBranches() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();

  const query = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      try {
        return await getBranches();
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : "Failed to load branches";
        throw new Error(errorMessage);
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

    const storedId = getStoredBranchId();
    const isOrgWide = hasOrgWideAccess(user);

    if (storedId === "all" || storedId === null) {
      if (isOrgWide) {
        dispatch(setCurrentBranch(null));
      } else {
        // Fallback for non-org-wide users: select first active, authorized branch
        removeStoredBranchId();
        const fallback = query.data.branches.find(
          (b) => b.isActive && hasBranchAccess(user, b.id)
        );
        if (fallback) {
          dispatch(setCurrentBranch(fallback.id));
          setStoredBranchId(fallback.id);
        } else {
          dispatch(setCurrentBranch(null)); // Zero accessible branches fallback
        }
      }
    } else {
      // Validate specific stored branch selection
      const exists = query.data.branches.some((b) => b.id === storedId);
      const isAuthorized = hasBranchAccess(user, storedId);
      const isActive = query.data.branches.find((b) => b.id === storedId)?.isActive;

      if (exists && isAuthorized && isActive) {
        dispatch(setCurrentBranch(storedId));
      } else {
        // Invalid or unauthorized selection: clear and fallback
        removeStoredBranchId();
        const fallback = query.data.branches.find(
          (b) => b.isActive && hasBranchAccess(user, b.id)
        );
        if (fallback) {
          dispatch(setCurrentBranch(fallback.id));
          setStoredBranchId(fallback.id);
        } else {
          dispatch(setCurrentBranch(null)); // Zero accessible branches fallback
        }
      }
    }
  }, [query.data, dispatch, user]);

  return {
    branches: query.data?.branches ?? [],
    organization: query.data?.organization ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
