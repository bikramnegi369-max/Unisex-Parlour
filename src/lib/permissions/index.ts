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
  | "activity-logs.view";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Manager" | "Receptionist" | "Stylist" | "Accountant";
  permissions: PermissionType[];
}

export function hasPermission(user: UserSession | null, permission: PermissionType): boolean {
  if (!user) return false;
  // Owners bypass all permission checks
  if (user.role === "Owner") return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: UserSession | null, permissions: PermissionType[]): boolean {
  if (!user) return false;
  if (user.role === "Owner") return true;
  return permissions.some((permission) => user.permissions.includes(permission));
}

export function hasAllPermissions(user: UserSession | null, permissions: PermissionType[]): boolean {
  if (!user) return false;
  if (user.role === "Owner") return true;
  return permissions.every((permission) => user.permissions.includes(permission));
}
