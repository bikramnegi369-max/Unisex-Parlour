import React from "react";
import type { Metadata } from "next";
import FinanceDashboardView from "@/features/finance/components/FinanceDashboardView";

export const metadata: Metadata = {
  title: "Finance & Register Control | Unisex Parlour ERP",
  description:
    "Reconcile daily POS registers, audit tender discrepancies, monitor working capital, and review store Operating Profit (P&L) statements.",
};

export default function FinancePage() {
  return (
    <div className="p-6">
      <FinanceDashboardView />
    </div>
  );
}
