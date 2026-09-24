import { Layers } from "lucide-react";

export const SUBSCRIPTIONS_CONFIG = {
  routes: {
    subscriptions: {
      list: "/subscriptions",
      detail: (id: string) => `/subscriptions/${id}`,
    },
  },
  navigation: {
    label: "Subscriptions",
    icon: Layers,
  },
  permissions: {
    view: "subscriptions.view",
    sell: "subscriptions.sell",
    configure: "subscriptions.configure",
    redeem: "subscriptions.redeem",
  },
  labels: {
    singular: "Subscription",
    plural: "Subscriptions",
    emptyStateTitle: "No Subscriptions Found",
    emptyStateDescription: "Create a customer subscription to assign prepaid service entitlements.",
    searchPlaceholder: "Search subscriptions by code or customer...",
  },
  defaults: {
    pageSize: 10,
    sorting: "createdAt",
  },
} as const;
