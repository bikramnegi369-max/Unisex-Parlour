"use client";

import React, { useState } from "react";
import { useOperatingProfit } from "../hooks";
import { useProcurementOverview } from "@/features/procurement/hooks/useProcurement";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import Link from "next/link";
import {
  TrendingUp,
  ArrowDownRight,
  CircleDollarSign,
  Receipt,
  Calendar,
  Truck,
  ExternalLink,
} from "lucide-react";

export default function OperatingProfitOverview() {
  const { currentBranch, isAllBranchesSelected } = useBranchContext();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const currentDay = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);

  // Canonical Hook for server state
  const { data: report, isLoading, isError, refetch } = useOperatingProfit(
    startDate,
    endDate
  );

  // Authoritative procurement overview via Canonical Hook
  const { data: procurementOverview } = useProcurementOverview(currentBranch?.id);

  const grossRevenue = report?.grossRevenue || 0;
  const refunds = report?.refunds || 0;
  const netRevenue = report?.netRevenue || 0;
  const operatingExpenses = report?.operatingExpenses?.total || 0;
  const grossPayroll = report?.workforceCosts?.finalizedGrossPayroll || 0;
  const operatingProfit = report?.operatingProfit || 0;
  const marginPct = report?.operatingMarginPercentage || 0;

  return (
    <div className="space-y-6">
      {/* Mandatory Accounting Cost Coverage Disclosure */}
      {report?.costCoverageNotice && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Accounting Disclosure: Cost Coverage Limitation</span>
            <p className="text-amber-800 dark:text-amber-300">
              {report.costCoverageNotice}
            </p>
          </div>
        </div>
      )}

      {/* Scope and Date Selection Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Financial Statement Period:
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-34 text-xs font-mono"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 w-34 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Active Scope:{" "}
            <strong className="text-foreground">
              {isAllBranchesSelected ? "All Salon Branches (Consolidated)" : currentBranch?.name}
            </strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-8"
          >
            Refresh Figures
          </Button>
        </div>
      </div>

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Invoiced Revenue */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
            Gross Invoiced Revenue
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatCurrency(grossRevenue)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Finalized POS invoices before returns
          </p>
        </div>

        {/* Refunds & Returns */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Customer Refunds
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatCurrency(refunds)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Completed payment refunds in period
          </p>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Receipt className="h-3.5 w-3.5" />
            Approved Operating Expenses
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatCurrency(operatingExpenses)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Utilities, maintenance, consumables, rent
          </p>
        </div>

        {/* Operating Profit */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-primary/10 via-card to-card border border-primary/25 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Operating Profit (P&L)
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-2">
            <span>{formatCurrency(operatingProfit)}</span>
            <span
              className={`text-xs font-semibold ${
                marginPct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              ({marginPct}%)
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Net Revenue minus Operational Expenses
          </p>
        </div>
      </div>

      {/* Procurement & Supply Chain Working Capital Card */}
      {procurementOverview && (
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Supplier Obligations & Working Capital
                </span>
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                  Authoritative Procurement Model
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Total unpaid bills owed to registered salon suppliers:{" "}
                <strong className="text-foreground font-mono">
                  {formatCurrency(procurementOverview.outstandingSupplierBalance || 0)}
                </strong>{" "}
                across {procurementOverview.unpaidInvoicesCount || 0} pending invoices.
              </p>
            </div>
          </div>

          <Link
            href="/procurement"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline shrink-0"
          >
            Review Procurement Invoices
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Financial Statement & Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Accrual Income Statement Breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Accrual Operating Statement
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              Branch Timezone Bound
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Revenue Line */}
            <div className="flex items-center justify-between py-2 border-b border-border/60">
              <span className="font-medium text-foreground">1. Gross Billed Revenue</span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(grossRevenue)}
              </span>
            </div>

            {/* Refund Deduction Line */}
            <div className="flex items-center justify-between py-2 border-b border-border/60 text-rose-600 dark:text-rose-400">
              <span className="font-medium">2. Less: Completed Customer Refunds</span>
              <span className="font-mono font-semibold">-{formatCurrency(refunds)}</span>
            </div>

            {/* Net Revenue Subtotal */}
            <div className="flex items-center justify-between py-2.5 bg-muted/20 px-3 rounded-lg font-bold text-foreground">
              <span>Net Revenue (1 - 2)</span>
              <span className="font-mono">{formatCurrency(netRevenue)}</span>
            </div>

            {/* Expenses Deduction Line */}
            <div className="flex items-center justify-between py-2 border-b border-border/60 text-amber-600 dark:text-amber-400">
              <span className="font-medium">3. Less: Approved Operating Expenses</span>
              <span className="font-mono font-semibold">-{formatCurrency(operatingExpenses)}</span>
            </div>

            {/* Workforce Payroll Deduction Line */}
            <div className="flex items-center justify-between py-2 border-b border-border/60 text-purple-600 dark:text-purple-400">
              <span className="font-medium">
                4. Less: Finalized Gross Workforce Payroll (
                {report?.workforceCosts?.approvedStaffCount || 0} Staff)
              </span>
              <span className="font-mono font-semibold">-{formatCurrency(grossPayroll)}</span>
            </div>

            {/* Operating Profit Total */}
            <div className="flex items-center justify-between py-3.5 bg-primary/10 border border-primary/20 px-4 rounded-xl font-bold text-sm text-foreground">
              <div className="space-y-0.5">
                <div>Operating Result (Before Stock Consumption)</div>
                <div className="text-[11px] font-normal text-muted-foreground">
                  Operating Margin: {marginPct}%
                </div>
              </div>
              <span className="font-mono text-base text-primary">
                {formatCurrency(operatingProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Col: Expense Categories Distribution */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Expense Categories Breakdown
            </h3>
          </div>

          <div className="p-4 space-y-3">
            {report?.operatingExpenses &&
            Object.keys(report.operatingExpenses).filter((k) => k !== "total").length > 0 ? (
              Object.entries(report.operatingExpenses)
                .filter(([k]) => k !== "total")
                .map(([category, amount]) => {
                  const pct =
                    operatingExpenses > 0
                      ? Math.round(((amount as number) / operatingExpenses) * 100)
                      : 0;

                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="capitalize font-medium text-foreground">{category}</span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(amount as number)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No categorized operating expenses recorded for this period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
