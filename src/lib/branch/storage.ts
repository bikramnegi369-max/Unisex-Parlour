/**
 * Branch Selection Persistence Helpers
 *
 * Persists the selected branch ID to localStorage so the user's
 * active branch is restored after a page refresh.
 *
 * null = "All Branches" scope (no specific branch selected).
 */

const BRANCH_KEY = "erp_selected_branch_id";

/** Returns the stored branch ID, or null if "All Branches" / not set. */
export function getStoredBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BRANCH_KEY);
}

/** Persists a specific branch ID to localStorage. */
export function setStoredBranchId(branchId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BRANCH_KEY, branchId);
}

/**
 * Clears the stored branch ID.
 * Called when the user selects "All Branches" or on logout.
 */
export function removeStoredBranchId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BRANCH_KEY);
}
