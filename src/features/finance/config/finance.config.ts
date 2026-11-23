import { CircleDollarSign } from "lucide-react";

export const FINANCE_CONFIG = {
  routes: {
    dashboard: "/finance",
    expenses: "/expenses",
    billing: "/billing",
    procurement: "/procurement",
  },
  navigation: {
    label: "Finance & Register Control",
    icon: CircleDollarSign,
  },
  permissions: {
    view: "finance.view",
    create: "finance.create",
    edit: "finance.edit",
  },
  defaults: {
    pageSize: 10,
    pageSizeOptions: [10, 20, 50],
    defaultTimezone: "Asia/Kolkata",
  },
} as const;
