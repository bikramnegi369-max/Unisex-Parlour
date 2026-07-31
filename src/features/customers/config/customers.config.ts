import { Users } from "lucide-react";

export const CUSTOMERS_CONFIG = {
  routes: {
    customers: {
      list: "/customers",
      detail: (id: string) => `/customers/${id}`,
    },
  },
  navigation: {
    label: "Customers",
    icon: Users,
  },
  permissions: {
    view: "customers.view",
    create: "customers.create",
    edit: "customers.edit",
    delete: "customers.delete",
  },
  labels: {
    customer: {
      singular: "Customer",
      plural: "Customers",
      emptyStateTitle: "No Customers Found",
      emptyStateDescription: "Create a new customer profile or switch active branches to get started.",
      searchPlaceholder: "Search customers by name, phone, or email...",
    },
  },
  defaults: {
    pageSize: 10,
    sorting: "name",
  },
} as const;
