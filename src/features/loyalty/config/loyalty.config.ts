import { Award } from "lucide-react";

export const LOYALTY_CONFIG = {
  routes: {
    loyalty: "/loyalty",
  },
  navigation: {
    label: "Loyalty",
    icon: Award,
  },
  permissions: {
    view: "loyalty.view" as const,
    configure: "loyalty.configure" as const,
    adjust: "loyalty.adjust" as const,
  },
  labels: {
    singular: "Loyalty Program",
    ledger: "Loyalty Ledger",
    adjust: "Adjust Points",
    emptyLedgerTitle: "No Loyalty Transactions",
    emptyLedgerDescription: "Transactions from point earnings, redemptions, adjustments, and reversals will appear here.",
  },
  defaults: {
    pageSize: 10,
  },
} as const;
