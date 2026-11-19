"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useAppDispatch } from "@/hooks/store";
import { setAvailableBranches, setOrganization, setCurrentBranch } from "@/store/slices/branchSlice";
import { getBranches } from "../api/branches.api";
import { getStoredBranchId, removeStoredBranchId, setStoredBranchId } from "@/lib/branch/storage";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasOrgWideAccess, hasBranchAccess } from "@/lib/permissions";
import axios from "axios";
import type { Branch } from "@/types/branch";

export function useBranches() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();

  const query = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      try {
        return await getBranches();
      } catch (err) {
        // If the user does not have permission to view all branches (403),
        // gracefully fall back instead of throwing an unhandled UI error.
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          return null;
        }
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

  // Synthesize branches list:
  // If GET /branches succeeded with data, use it.
  // If the user lacks branches.view (or query returned null), construct the branch list
  // directly from the user's active session branchAccess.
  const effectiveBranches = useMemo<Branch[]>(() => {
    if (query.data?.branches && query.data.branches.length > 0) {
      return query.data.branches;
    }

    if (user?.branchAccess && user.branchAccess.length > 0) {
      return user.branchAccess
        .filter((ba) => ba.isActive)
        .map((ba) => ({
          id: ba.branchId,
          name: ba.branchName || "Branch",
          organizationId: user.organizationId,
          isActive: ba.isActive,
        }));
    }

    return [];
  }, [query.data?.branches, user?.branchAccess, user?.organizationId]);

  const effectiveOrganization = useMemo(() => {
    if (query.data?.organization) {
      return query.data.organization;
    }
    if (user?.organizationId) {
      return {
        id: user.organizationId,
        name: "",
      };
    }
    return null;
  }, [query.data?.organization, user?.organizationId]);

  // Populate Redux store when branches are available
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (effectiveOrganization) {
      dispatch(setOrganization(effectiveOrganization));
    }
    dispatch(setAvailableBranches(effectiveBranches));

    const storedId = getStoredBranchId();
    const isOrgWide = hasOrgWideAccess(user);

    if (storedId === "all" || storedId === null) {
      if (isOrgWide) {
        dispatch(setCurrentBranch(null));
      } else {
        // Fallback for non-org-wide users: select first active, authorized branch
        removeStoredBranchId();
        const fallback = effectiveBranches.find(
          (b: Branch) => b.isActive && hasBranchAccess(user, b.id)
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
      const exists = effectiveBranches.some((b: Branch) => b.id === storedId);
      const isAuthorized = hasBranchAccess(user, storedId);
      const isActive = effectiveBranches.find((b: Branch) => b.id === storedId)?.isActive;

      if (exists && isAuthorized && isActive) {
        dispatch(setCurrentBranch(storedId));
      } else {
        // Invalid or unauthorized selection: clear and fallback
        removeStoredBranchId();
        const fallback = effectiveBranches.find(
          (b: Branch) => b.isActive && hasBranchAccess(user, b.id)
        );
        if (fallback) {
          dispatch(setCurrentBranch(fallback.id));
          setStoredBranchId(fallback.id);
        } else {
          dispatch(setCurrentBranch(null)); // Zero accessible branches fallback
        }
      }
    }
  }, [effectiveBranches, effectiveOrganization, dispatch, user, isAuthenticated]);

  return {
    branches: effectiveBranches,
    organization: effectiveOrganization,
    isLoading: query.isLoading,
    isError: query.isError && !query.data && effectiveBranches.length === 0,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
