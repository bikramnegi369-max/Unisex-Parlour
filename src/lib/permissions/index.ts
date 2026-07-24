import type { BranchAccess } from "@/types/branch";

export type PermissionType =
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"
  | "appointments.view"
  | "appointments.create"
  | "appointments.edit"
  | "appointments.cancel"
  | "employees.view"
  | "employees.create"
  | "employees.edit"
  | "employees.delete"
  | "services.view"
  | "services.create"
  | "services.edit"
  | "services.delete"
  | "billing.view"
  | "billing.create"
  | "billing.refund"
  | "finance.view"
  | "finance.create"
  | "finance.edit"
  | "inventory.view"
  | "inventory.create"
  | "inventory.adjust"
  | "reports.view"
  | "settings.view"
  | "settings.edit"
  | "users.manage"
  | "roles.manage"
  | "branches.manage"
  | "activity-logs.view";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Receptionist" | "Stylist" | "Accountant";
  permissions: PermissionType[];
  /** The organization this user belongs to. */
  organizationId: string;
  /**
   * List of branches the user is authorized to access.
   * Owners typically receive access to all branches via the backend.
   * An empty array means no branch access has been granted yet.
   */
  branchAccess: BranchAccess[];
}

// ---------------------------------------------------------------------------
// Permission Helpers
// ---------------------------------------------------------------------------

export function hasPermission(user: UserSession | null, permission: PermissionType): boolean {
  if (!user) return false;
  // Owners bypass all permission checks
  if (user.role === "Owner") return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: UserSession | null, permissions: PermissionType[]): boolean {
  if (!user) return false;
  if (user.role === "Owner") return true;
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(user: UserSession | null, permissions: PermissionType[]): boolean {
  if (!user) return false;
  if (user.role === "Owner") return true;
  return permissions.every((p) => user.permissions.includes(p));
}

// ---------------------------------------------------------------------------
// Branch Access Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the user has access to the given branch.
 * Owners always have access to all branches.
 */
export function hasBranchAccess(user: UserSession | null, branchId: string): boolean {
  if (!user) return false;
  if (user.role === "Owner") return true;
  return user.branchAccess.some((b) => b.branchId === branchId && b.isActive);
}

/**
 * Returns the list of active branches the user is authorized to access.
 * For Owners this returns all provided branches (backend controls actual scope).
 */
export function getAccessibleBranches(user: UserSession | null): BranchAccess[] {
  if (!user) return [];
  return user.branchAccess.filter((b) => b.isActive);
}

/**
 * Returns true if the user has org-wide access across all branches.
 * This drives whether the "All Branches" switcher option is shown.
 */
export function hasOrgWideAccess(user: UserSession | null): boolean {
  if (!user) return false;
  return user.role === "Owner";
}

