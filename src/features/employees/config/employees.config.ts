import { UserCheck } from "lucide-react";

export const EMPLOYEES_CONFIG = {
  routes: {
    employees: {
      list: "/employees",
      detail: (id: string) => `/employees/${id}`,
    },
  },
  navigation: {
    label: "Employees",
    icon: UserCheck,
  },
  permissions: {
    view: "employees.view",
    create: "employees.create",
    edit: "employees.update",
    delete: "employees.delete",
    assignBranch: "employees.assign_branch",
    assignService: "employees.assign_service",
  },
  labels: {
    employee: {
      singular: "Employee",
      plural: "Employees",
      emptyStateTitle: "No Employees Found",
      emptyStateDescription: "Create a new staff profile or switch active branches to get started.",
      searchPlaceholder: "Search employees by name, phone, email, or designation...",
    },
  },
  defaults: {
    pageSize: 10,
    sorting: "name",
  },
} as const;
