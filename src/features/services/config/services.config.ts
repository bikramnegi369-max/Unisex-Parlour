import { Scissors } from "lucide-react";

export const SERVICES_CONFIG = {
  routes: {
    services: {
      list: "/services",
      detail: (id: string) => `/services/${id}`,
    },
    categories: {
      list: "/services/categories",
      detail: (id: string) => `/services/categories/${id}`,
    },
  },
  navigation: {
    label: "Services",
    icon: Scissors,
  },
  permissions: {
    view: "services.view",
    create: "services.create",
    edit: "services.edit",
    delete: "services.delete",
  },
  labels: {
    service: {
      singular: "Service",
      plural: "Services",
      emptyStateTitle: "No Services Found",
      emptyStateDescription: "Create a new service treatment or switch active branches to get started.",
      searchPlaceholder: "Search services by name or code...",
    },
    category: {
      singular: "Category",
      plural: "Categories",
      emptyStateTitle: "No Categories Found",
      emptyStateDescription: "Create a new service category or switch active branches to get started.",
      searchPlaceholder: "Search categories by name...",
    },
  },
  defaults: {
    pageSize: 10,
    duration: 30,
    sorting: "name",
  },
} as const;
