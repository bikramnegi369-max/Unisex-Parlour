import { PermissionType } from "./index";

/**
 * Maps frontend route path segments to their required permissions.
 * Keys should be the pathname sub-path or exact path (e.g. "/users", "/roles").
 * The guard will check if the user has the mapped permission to access the route.
 */
export const routePermissions = {
  "/dashboard": null, // Common authenticated navigation
  "/users": "users.view",
  "/roles": "roles.view",
  "/branches": "branches.view",
  "/billing": "billing.view",
  "/expenses": "expenses.view",
  "/finance": "finance.view",
  "/reports": [
    "reports.revenue.view",
    "reports.performance.view",
    "reports.retention.view",
    "reports.inventory.view",
    "reports.services.view",
  ],
  "/customers": "customers.view",
  "/appointments": "appointments.view",
  "/employees": "employees.view",
  "/leaves": "employees.leaves.view",
  "/attendance": "attendance.view",
  "/services": "services.view",
  "/services/categories": "services.view",
  "/memberships": "billing.view",
  "/coupons": "coupons.view",
  "/loyalty": "loyalty.view",
  "/inventory": "inventory.view",
  "/suppliers": "procurement.suppliers.view",
  "/procurement": "procurement.orders.view",
  "/activity-logs": "activity-logs.view",
  "/audit-logs": "logs.view",
  "/subscriptions": "subscriptions.view",
  "/payroll": "payroll.view",
  "/incentives": "incentives.view",
  "/settings": "settings.view",
} as const satisfies Record<string, PermissionType | readonly PermissionType[] | null>;

export type RoutePath = keyof typeof routePermissions;

