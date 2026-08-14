import { ShieldCheck } from "lucide-react";

export const USERS_CONFIG = {
  routes: {
    users: {
      list: "/users",
      detail: (id: string) => `/users/${id}`,
    },
  },
  navigation: {
    label: "Users",
    icon: ShieldCheck,
  },
  permissions: {
    view: "users.view",
    create: "users.create",
    edit: "users.update",
    delete: "users.update",
  },
  labels: {
    user: {
      singular: "User",
      plural: "Users",
      emptyStateTitle: "No Users Found",
      emptyStateDescription:
        "Register a new user account or switch active branches to get started.",
      searchPlaceholder: "Search users by name, email, or phone...",
    },
  },
  defaults: {
    pageSize: 10,
    sorting: "name",
  },
} as const;