import { Receipt } from "lucide-react";

export const EXPENSES_CONFIG = {
  routes: {
    list: "/expenses",
    finance: "/finance",
    procurement: "/procurement",
  },
  navigation: {
    label: "Expenses & Cash Drawer",
    icon: Receipt,
  },
  permissions: {
    view: "expenses.view",
    create: "expenses.create",
    update: "expenses.update",
    delete: "expenses.delete",
    approve: "expenses.update",
    reject: "expenses.update",
    replenish: "expenses.create",
    recover: "expenses.create",
  },
  defaults: {
    pageSize: 15,
    pageSizeOptions: [10, 15, 25, 50],
    defaultApprovalThreshold: 5000,
    sortBy: "expenseDate",
    sortOrder: "desc" as const,
  },
  categories: [
    { value: "utilities", label: "Utilities (Electricity, Water, Internet)" },
    { value: "maintenance", label: "Maintenance & Repairs" },
    { value: "refreshments", label: "Client & Staff Refreshments" },
    { value: "cleaning", label: "Cleaning & Salon Hygiene" },
    { value: "laundry", label: "Laundry & Towel Service" },
    { value: "supplies", label: "Salon Consumables & Products" },
    { value: "marketing", label: "Local Marketing & Signage" },
    { value: "other", label: "Other Operational Costs" },
  ],
} as const;
