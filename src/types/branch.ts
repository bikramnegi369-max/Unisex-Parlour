/**
 * Multi-Branch Type Definitions
 *
 * These interfaces describe the organization / branch hierarchy.
 * They are intentionally decoupled from the backend data model —
 * map them to real API responses in the relevant API service files.
 */

/** Top-level business entity that owns one or more branches. */
export interface Organization {
  id: string;
  name: string;
  /** Optional URL to the org logo. */
  logo?: string;
}

/**
 * A single physical or logical branch of the organization.
 * Appointments, billing, inventory, and employees are branch-scoped.
 */
export interface Branch {
  id: string;
  name: string;
  organizationId: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  timezone?: string;
}

/**
 * Describes a user's access to a specific branch.
 * A user may appear in multiple BranchAccess entries.
 */
export interface BranchAccess {
  branchId: string;
  branchName: string;
  /** Reflects whether the branch itself is currently active. */
  isActive: boolean;
}

/**
 * Sentinel string used as a TanStack Query key segment and display label
 * when the user is viewing all branches (no specific branch selected).
 */
export const ALL_BRANCHES_KEY = "all" as const;

/** Type guard — true when the user is in "All Branches" scope. */
export function isAllBranchesScope(branchId: string | null): boolean {
  return branchId === null;
}
