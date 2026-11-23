import React from "react";
import type { Metadata } from "next";
import ExpenseList from "@/features/expenses/components/ExpenseList";

export const metadata: Metadata = {
  title: "Expenses & Cash Drawer | Unisex Parlour ERP",
  description:
    "Record operational salon expenditures, reconcile supplier bills, manage manager approvals, and track the append-only cash drawer ledger.",
};

export default function ExpensesPage() {
  return (
    <div className="p-6">
      <ExpenseList />
    </div>
  );
}
