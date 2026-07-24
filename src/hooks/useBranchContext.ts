"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./store";
import { setCurrentBranch } from "@/store/slices/branchSlice";
import { setStoredBranchId, removeStoredBranchId } from "@/lib/branch/storage";
import { ALL_BRANCHES_KEY } from "@/types/branch";
import type { Branch, Organization } from "@/types/branch";

/**
 * useBranchContext
 *
 * Centralized access to all branch-related state.
 * Abstracts Redux selectors and dispatch — components never import
 * from Redux directly for branch concerns.
 */
export function useBranchContext() {
  const dispatch = useAppDispatch();

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
   * Switch to a specific branch, or pass null to select "All Branches".
   * Persists the selection to localStorage.
   */
  const selectBranch = useCallback(
    (branchId: string | null) => {
      dispatch(setCurrentBranch(branchId));
      if (branchId) {
        setStoredBranchId(branchId);
      } else {
        removeStoredBranchId();
      }
    },
    [dispatch]
  );

  return {
    currentBranch,
    currentBranchId,
    availableBranches,
    currentOrganization,
    isAllBranchesSelected,
    /** Use in TanStack Query keys for branch-scoped cache separation. */
    branchKey,
    selectBranch,
  };
}
