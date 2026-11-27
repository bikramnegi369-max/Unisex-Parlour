"use client";

import React, { useState } from "react";
import { useBranchPerformance } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Building2,
  Calendar,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from "lucide-react";

export default function BranchPerformanceMatrix() {
  const { selectBranch, isAllBranchesSelected, currentBranch } =
    useBranchContext();

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const currentDay = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isError, refetch } = useBranchPerformance(
    startDate,
    endDate,
    page,
    pageSize,
  );

  const branches = data?.branches || [];
  const consolidated = data?.consolidated;
  const pagination = data?.pagination;

  const handlePreset = (
    type: "today" | "yesterday" | "week" | "mtd" | "last_month" | "last_30",
  ) => {
    const now = new Date();
    if (type === "today") {
      const d = now.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
    } else if (type === "yesterday") {
      const y = new Date(now.setDate(now.getDate() - 1))
        .toISOString()
        .slice(0, 10);
      setStartDate(y);
      setEndDate(y);
    } else if (type === "week") {
      const d = new Date();
      const first = d.getDate() - d.getDay();
      setStartDate(new Date(d.setDate(first)).toISOString().slice(0, 10));
      setEndDate(new Date().toISOString().slice(0, 10));
    } else if (type === "mtd") {
      setStartDate(
        new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10),
      );
      setEndDate(new Date().toISOString().slice(0, 10));
    } else if (type === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (type === "last_30") {
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      setStartDate(start);
      setEndDate(new Date().toISOString().slice(0, 10));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load Branch Performance"
        description="Could not aggregate financial metrics across salon branches."
        retryAction={{ label: "Retry", onClick: () => refetch() }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Scope Toolbar & Period Presets */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Period:</span>
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

          <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset("today")}
              className="text-[11px] h-7 px-2"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset("mtd")}
              className="text-[11px] h-7 px-2"
            >
              MTD
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset("last_month")}
              className="text-[11px] h-7 px-2"
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePreset("last_30")}
              className="text-[11px] h-7 px-2"
            >
              Last 30D
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Current Scope:{" "}
            <strong className="text-foreground">
              {isAllBranchesSelected
                ? "All Salon Branches"
                : currentBranch?.name}
            </strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Consolidated Highlights */}
      {consolidated && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Consolidated Net Revenue
            </span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">
              {formatCurrency(consolidated.netRevenue)}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Gross: {formatCurrency(consolidated.grossRevenue)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Cash Collections
            </span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(consolidated.totalCollected)}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Invoices: {consolidated.invoiceCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Operating Overhead
            </span>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrency(consolidated.operatingExpenses)}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Approved vouchers
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Finalized Payroll
            </span>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {formatCurrency(consolidated.finalizedGrossPayroll)}
            </div>
            <span className="text-[10px] text-muted-foreground">
              Disbursed: {formatCurrency(consolidated.actualDisbursedPayroll)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs col-span-2 md:col-span-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Operating Result
            </span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                consolidated.operatingResult >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatCurrency(consolidated.operatingResult)}
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              Margin: {consolidated.operatingMarginPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Branch-by-Branch Financial Performance Matrix
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {branches.length} {branches.length === 1 ? "Branch" : "Branches"} in
            Scope
          </span>
        </div>

        {branches.length === 0 ? (
          <EmptyState
            title="No Branch Data Found"
            description="No active branches match the selected period or filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-3 text-right">Gross Invoiced</th>
                  <th className="py-3 px-3 text-right">Refunds</th>
                  <th className="py-3 px-3 text-right">Net Revenue</th>
                  <th className="py-3 px-3 text-right">Collections</th>
                  <th className="py-3 px-3 text-right">Expenses</th>
                  <th className="py-3 px-3 text-right">Payroll</th>
                  <th className="py-3 px-3 text-right">Operating Result</th>
                  <th className="py-3 px-3 text-right">Margin %</th>
                  <th className="py-3 px-3 text-center">Alerts</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {branches.map((b: (typeof branches)[number]) => (
                  <tr
                    key={b.branchId}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div>{b.branchName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {b.branchCode || b.timezone}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium">
                      {formatCurrency(b.grossRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-destructive">
                      {b.refunds > 0 ? `-${formatCurrency(b.refunds)}` : "₹0"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                      {formatCurrency(b.netRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(b.collections?.totalCollected || 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-400">
                      {formatCurrency(b.operatingExpenses)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                      {formatCurrency(b.finalizedGrossPayroll)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold ${
                        b.operatingResult >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }`}
                    >
                      {formatCurrency(b.operatingResult)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {b.operatingMarginPercentage}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      {b.unreconciledClosuresCount > 0 ||
                      b.pendingExpenseApprovalsCount > 0 ? (
                        <div className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          <span>
                            {b.unreconciledClosuresCount +
                              b.pendingExpenseApprovalsCount}
                          </span>
                        </div>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectBranch(b.branchId)}
                        className="h-7 text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
                      >
                        <Filter className="h-3 w-3 mr-1" />
                        Focus Branch
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(pagination || branches.length > 0) && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={pagination?.page ?? page}
              totalPages={Math.max(1, pagination?.totalPages ?? 1)}
              totalItems={pagination?.total ?? branches.length}
              onPageChange={setPage}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="branches"
            />
          </div>
        )}
      </div>
    </div>
  );
}
