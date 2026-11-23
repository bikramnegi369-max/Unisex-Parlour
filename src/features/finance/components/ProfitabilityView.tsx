"use client";

import React, { useState } from "react";
import { useOperatingProfit } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import BranchPerformanceMatrix from "./BranchPerformanceMatrix";
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  Info,
  DollarSign,
  Receipt,
  Users,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function ProfitabilityView() {
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEndDate = today.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const { data: report, isLoading, isError, refetch } = useOperatingProfit(
    startDate,
    endDate
  );

  const netRevenue = report?.netRevenue || 0;
  const grossRevenue = report?.grossRevenue || 0;
  const refunds = report?.refunds || 0;
  const operatingExpenses = report?.operatingExpenses?.total || 0;
  const workforceLabor = report?.workforceCosts?.finalizedGrossPayroll || 0;
  const operatingResult = report?.operatingResult ?? report?.operatingProfit ?? 0;
  const operatingMargin = report?.operatingMarginPercentage || 0;

  const isProfitable = operatingResult >= 0;

  // Expense categories without 'total'
  const expenseEntries = Object.entries(report?.operatingExpenses || {}).filter(
    ([key]) => key !== "total"
  );

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Financial Performance Window
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setStartDate(defaultStartDate);
              setEndDate(defaultEndDate);
            }}
            className="text-xs h-8"
          >
            Reset MTD
          </Button>
        </div>
      </div>

      {/* Mandatory Accounting Disclosure Notice */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">
            Statement of Operating Results (Before Stock Consumption)
          </span>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {report?.costCoverageNotice ||
              "Operating Result reflects Net Invoiced Revenue minus Approved Operating Expenses and Finalized Gross Payroll. Stock consumption (COGS) is excluded due to lack of batch valuation."}
          </p>
        </div>
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Net Invoiced Revenue</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-foreground">
            {isLoading ? "..." : formatCurrency(netRevenue)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Gross {formatCurrency(grossRevenue)} - Refunds {formatCurrency(refunds)}
          </p>
        </div>

        {/* Operating Overhead */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Approved Overhead</span>
            <Receipt className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-foreground">
            {isLoading ? "..." : formatCurrency(operatingExpenses)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Non-stock utilities, rent, supplies, maintenance
          </p>
        </div>

        {/* Workforce Labor */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Workforce Payroll</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-foreground">
            {isLoading ? "..." : formatCurrency(workforceLabor)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {report?.workforceCosts?.approvedStaffCount || 0} approved staff payslips
          </p>
        </div>

        {/* Operating Result */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Result</span>
            <div
              className={`p-1.5 rounded-xl ${
                isProfitable
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isProfitable ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold font-mono ${
              isProfitable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            }`}
          >
            {isLoading ? "..." : formatCurrency(operatingResult)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Operating Margin:</span>
            <span className="font-mono font-bold text-foreground">{operatingMargin}%</span>
          </div>
        </div>
      </div>

      {/* Revenue Streams and Expense Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Streams */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Revenue Streams Breakdown
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                label: "Services Revenue",
                amount: report?.revenueStreams?.services || 0,
                color: "bg-primary",
              },
              {
                label: "Retail Products",
                amount: report?.revenueStreams?.retailProducts || 0,
                color: "bg-emerald-500",
              },
              {
                label: "Memberships Sold",
                amount: report?.revenueStreams?.memberships || 0,
                color: "bg-purple-500",
              },
              {
                label: "Subscriptions",
                amount: report?.revenueStreams?.subscriptions || 0,
                color: "bg-blue-500",
              },
            ].map((stream) => {
              const pct = grossRevenue > 0 ? ((stream.amount / grossRevenue) * 100).toFixed(1) : "0";
              return (
                <div key={stream.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stream.label}</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrency(stream.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stream.color} rounded-full`}
                      style={{ width: `${Math.min(Number(pct), 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operating Expense Overhead Categories */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Operating Overhead Categories
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              Total: {formatCurrency(operatingExpenses)}
            </span>
          </div>

          {expenseEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No approved operating expenses recorded in this period.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {expenseEntries.map(([category, amount]) => {
                const pct =
                  operatingExpenses > 0 ? ((amount / operatingExpenses) * 100).toFixed(1) : "0";
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize text-muted-foreground">
                        {category.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.min(Number(pct), 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cross-Branch Comparative Performance Matrix */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            Multi-Branch Comparative Financial Performance
          </h3>
        </div>
        <BranchPerformanceMatrix />
      </div>
    </div>
  );
}
