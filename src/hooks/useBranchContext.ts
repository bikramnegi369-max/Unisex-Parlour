"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./store";
import { setCurrentBranch } from "@/store/slices/branchSlice";
import { setStoredBranchId } from "@/lib/branch/storage";
import { ALL_BRANCHES_KEY } from "@/types/branch";
import type { Branch, Organization } from "@/types/branch";
import { useQueryClient } from "@tanstack/react-query";
import { getScopeQueryKey } from "@/lib/api/queryKeys";

/**
 * useBranchContext
 *
 * Centralized access to all branch-related state.
 * Abstracts Redux selectors and dispatch — components never import
 * from Redux directly for branch concerns.
 */
export function useBranchContext() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const currentBranchId = useAppSelector((state) => state.branch.currentBranchId);
  const availableBranches = useAppSelector((state) => state.branch.availableBranches);
  const currentOrganization: Organization | null = useAppSelector((state) => state.branch.currentOrganization);

  /** The full Branch object for the currently selected branch, or null for "All Branches". */
  const currentBranch: Branch | null =
    currentBranchId !== null
      ? availableBranches.find((b) => b.id === currentBranchId) ?? null
      : null;

  /** True when the user is viewing all branches (no specific branch selected). */
  const isAllBranchesSelected = currentBranchId === null;

  /**
   * TanStack Query-safe branch key.
   * Use this in query keys to ensure cache separation between branches.
   *
   * Example:
   *   queryKey: ['customers', organizationId, branchKey, filters]
   */
  const branchKey = currentBranchId ?? ALL_BRANCHES_KEY;

  /**
   * Centralized helper to get a scope-aware query key.
   * Isolates caches cleanly between branches and organization-wide scopes.
   */
  const getBranchQueryKey = useCallback(
    (entityName: string, additionalKeys: unknown[] = []) => {
      return getScopeQueryKey(entityName, currentBranchId, additionalKeys);
    },
    [currentBranchId]
  );

  /**
   * Switch to a specific branch, or pass null to select "All Branches".
   * Persists the selection to localStorage.
   */
  const selectBranch = useCallback(
    (branchId: string | null) => {
      dispatch(setCurrentBranch(branchId));
      if (branchId) {
        setStoredBranchId(branchId);
      } else {
        setStoredBranchId("all");
      }

      // Invalidate all branch-scoped queries, preserving global auth and branch lists
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          if (key[0] === "auth-user" || key[0] === "branches") {
            return false;
          }
          return true;
        },
      });
    },
    [dispatch, queryClient]
  );

  const getBranchName = useCallback(
    (branchId: string) => {
      return availableBranches.find((b) => b.id === branchId)?.name || branchId;
    },
    [availableBranches]
  );

  return {
    currentBranch,
    currentBranchId,
    availableBranches,
    currentOrganization,
    isAllBranchesSelected,
    /** Use in TanStack Query keys for branch-scoped cache separation. */
    branchKey,
    getBranchQueryKey,
    selectBranch,
    getBranchName,
  };
}

