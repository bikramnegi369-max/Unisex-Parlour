"use client";

import React, { useState } from "react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Button } from "@/components/ui/button";
import {
  CircleDollarSign,
  Building2,
  ShieldAlert,
  Receipt,
  History,
} from "lucide-react";

// Sub-views & Components
import FinanceNavigation, { FinanceTabKey } from "./FinanceNavigation";
import FinanceAlertsBanner from "./FinanceAlertsBanner";
import FinancialIntelligenceOverview from "./FinancialIntelligenceOverview";
import RevenueCollectionsView from "./RevenueCollectionsView";
import ExpensesWorkspaceView from "./ExpensesWorkspaceView";
import PettyCashLedgerView from "./PettyCashLedgerView";
import DayClosureForm from "./DayClosureForm";
import ClosureHistoryTable from "./ClosureHistoryTable";
import PayrollCostsView from "./PayrollCostsView";
import SupplierObligationsView from "./SupplierObligationsView";
import ProfitabilityView from "./ProfitabilityView";
import FinancialTransactionsRegister from "./FinancialTransactionsRegister";
import FinancialReportsView from "./FinancialReportsView";
import FinanceAuditHistoryView from "./FinanceAuditHistoryView";
import { useFinancialAlerts } from "../hooks";

export default function FinanceDashboardView() {
  const { currentBranch, isAllBranchesSelected } = useBranchContext();
  const { user } = useAuth();
  const { data: alerts } = useFinancialAlerts();

  const canViewFinance = hasPermission(user, "finance.view");
  const canCreateClosure = hasPermission(user, "finance.create");
  const isCashier = user?.role === "cashier" || user?.role === "receptionist";
  const isAuditor = user?.role === "auditor";
  const isExpenseApprover =
    hasPermission(user, "expenses.update") && !hasPermission(user, "finance.view");

  const getDefaultTab = (): FinanceTabKey => {
    if (isCashier) return "daily-closing";
    if (isAuditor) return "audit";
    if (isExpenseApprover) return "expenses";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<FinanceTabKey>(getDefaultTab);
  const [closingSubTab, setClosingSubTab] = useState<"submit" | "history">(
    canCreateClosure ? "submit" : "history"
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fallback: If user has neither finance.view nor expenses.view nor cashier
  const canAccessAny =
    canViewFinance ||
    hasPermission(user, "expenses.view") ||
    hasPermission(user, "finance.create") ||
    isCashier;

  if (!canAccessAny) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          You do not have permission to view the Finance module. Please contact your salon
          administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header Banner */}
      <PageHeaderBanner
        title="Salon Financial Operations & Intelligence"
        description="Unified financial intelligence, multi-branch performance matrix, verified daily closures, operating profit, and audit trail."
        icon={CircleDollarSign}
        actions={
          <div className="flex items-center gap-2 bg-background/60 border border-border/80 px-3.5 py-1.5 rounded-xl text-xs">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">
              {isAllBranchesSelected ? "All Salon Branches" : currentBranch?.name || "No Branch"}
            </span>
            {currentBranch?.timezone && !isAllBranchesSelected && (
              <span className="font-mono text-muted-foreground border-l border-border pl-2 text-[11px]">
                {currentBranch.timezone}
              </span>
            )}
          </div>
        }
      />

      {/* Real-Time Attention & Working Capital Alerts */}
      <FinanceAlertsBanner />

      {/* 11-Area Role-Adaptive Sub-Navigation */}
      <FinanceNavigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={alerts?.pendingExpenseApprovals?.count || 0}
        unreconciledClosuresCount={alerts?.unreconciledClosures?.count || 0}
      />

      {/* Tab Panels */}
      <div className="animate-in fade-in duration-200">
        {activeTab === "overview" && (
          <FinancialIntelligenceOverview key={`exec-${refreshTrigger}`} />
        )}

        {activeTab === "revenue" && <RevenueCollectionsView />}

        {activeTab === "expenses" && <ExpensesWorkspaceView />}

        {activeTab === "petty-cash" && <PettyCashLedgerView />}

        {activeTab === "daily-closing" && (
          <div className="space-y-4">
            {/* Sub-navigation for Daily Register Closing */}
            <div className="flex items-center gap-2 bg-card p-2 rounded-2xl border border-border w-fit">
              <Button
                variant={closingSubTab === "submit" ? "default" : "ghost"}
                size="sm"
                onClick={() => setClosingSubTab("submit")}
                className="text-xs gap-1.5"
                disabled={!canCreateClosure}
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>Count & Submit Closing</span>
              </Button>
              <Button
                variant={closingSubTab === "history" ? "default" : "ghost"}
                size="sm"
                onClick={() => setClosingSubTab("history")}
                className="text-xs gap-1.5"
              >
                <History className="h-3.5 w-3.5" />
                <span>Closure Audit History</span>
              </Button>
            </div>

            {closingSubTab === "submit" ? (
              isAllBranchesSelected ? (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-8 text-center text-xs text-amber-800 dark:text-amber-300 max-w-lg mx-auto space-y-2">
                  <p className="font-bold text-sm">Branch Selection Required</p>
                  <p className="text-muted-foreground">
                    Register drawer reconciliations are strictly tied to a single physical salon location
                    and its physical cash drawer. Please choose a specific branch from the header switcher to count
                    or submit a daily closure.
                  </p>
                </div>
              ) : !canCreateClosure ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-muted-foreground max-w-lg mx-auto">
                  You do not have cashier permission to submit register closures. Please view the{" "}
                  <strong>Closure Audit History</strong> tab.
                </div>
              ) : (
                <DayClosureForm
                  onSuccess={() => {
                    setRefreshTrigger((prev) => prev + 1);
                    setClosingSubTab("history");
                  }}
                />
              )
            ) : (
              <ClosureHistoryTable key={refreshTrigger} />
            )}
          </div>
        )}

        {activeTab === "payroll" && <PayrollCostsView />}

        {activeTab === "suppliers" && <SupplierObligationsView />}

        {activeTab === "profitability" && <ProfitabilityView />}

        {activeTab === "transactions" && <FinancialTransactionsRegister />}

        {activeTab === "reports" && <FinancialReportsView />}

        {activeTab === "audit" && <FinanceAuditHistoryView />}
      </div>
    </div>
  );
}
