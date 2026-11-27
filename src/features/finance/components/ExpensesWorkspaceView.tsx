"use client";

import ExpenseList from "@/features/expenses/components/ExpenseList";

export default function ExpensesWorkspaceView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <ExpenseList hideHeader />
    </div>
  );
}
