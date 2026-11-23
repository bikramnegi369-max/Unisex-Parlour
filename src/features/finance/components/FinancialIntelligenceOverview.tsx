"use client";

import React, { useState } from "react";
import { useOperatingProfit } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CircleDollarSign,
  ArrowDownRight,
  Receipt,
  Users,
  TrendingUp,
  CreditCard,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Banknote,
} from "lucide-react";

export default function FinancialIntelligenceOverview() {
  const { currentBranch, isAllBranchesSelected } = useBranchContext();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const currentDay = today.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);

  const { data: report, isLoading, isError, refetch } = useOperatingProfit(
    startDate,
    endDate
  );

  const grossRevenue = report?.grossRevenue || 0;
  const refunds = report?.refunds || 0;
  const netRevenue = report?.netRevenue || 0;
  const operatingExpenses = report?.operatingExpenses?.total || 0;
  const grossPayroll = report?.workforceCosts?.finalizedGrossPayroll || 0;
  const operatingResult = report?.operatingResult ?? report?.operatingProfit ?? 0;
  const marginPct = report?.operatingMarginPercentage || 0;
  const streams = report?.revenueStreams || {
    services: 0,
    retailProducts: 0,
    memberships: 0,
    subscriptions: 0,
  };
  const collections = report?.collections || {
    cash: 0,
    card: 0,
    upi: 0,
    other: 0,
    totalCollected: 0,
    netCollections: 0,
  };

  return (
    <div className="space-y-6">
      {/* Scope and Date Selection Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Intelligence Period:
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
            Scope:{" "}
            <strong className="text-foreground">
              {isAllBranchesSelected
                ? "All Salon Branches (Consolidated)"
                : currentBranch?.name}
            </strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-8"
          >
            Refresh Intel
          </Button>
        </div>
      </div>

      {/* Mandatory Accounting Cost Coverage Disclosure */}
      {report?.costCoverageNotice && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Accounting Disclosure: Cost Coverage Limitation</span>
            <p className="text-amber-800 dark:text-amber-300">
              {report.costCoverageNotice}
            </p>
          </div>
        </div>
      )}

      {/* Primary Financial Intelligence Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
            Gross Invoiced Revenue
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatCurrency(grossRevenue)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Across {report?.invoiceCount || 0} finalized customer invoices
          </p>
        </div>

        {/* Customer Refunds */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Customer Refunds
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatCurrency(refunds)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Completed payment returns across all tenders
          </p>
        </div>

        {/* Net Invoiced Revenue */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Net Billed Revenue
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatCurrency(netRevenue)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Gross revenue minus customer refunds
          </p>
        </div>

        {/* Operating Result */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-primary/10 via-card to-card border border-primary/25 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Operating Result (Before Stock COGS)
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-2">
            <span>{formatCurrency(operatingResult)}</span>
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
            Net Revenue less Overhead & Gross Payroll
          </p>
        </div>
      </div>

      {/* Two Column Section: Revenue Streams & Tender Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream Breakdown */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Revenue Streams Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Invoiced Allocations
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: "Salon Services", amount: streams.services, color: "bg-primary" },
              { label: "Retail Products", amount: streams.retailProducts, color: "bg-blue-500" },
              { label: "Memberships Sold", amount: streams.memberships, color: "bg-purple-500" },
              { label: "Subscriptions Packages", amount: streams.subscriptions, color: "bg-emerald-500" },
            ].map((stream) => {
              const streamTotal =
                streams.services +
                streams.retailProducts +
                streams.memberships +
                streams.subscriptions;
              const pct = streamTotal > 0 ? Math.round((stream.amount / streamTotal) * 100) : 0;

              return (
                <div key={stream.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{stream.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(stream.amount)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stream.color} rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            * Subscription redemptions are recognized at ₹0 billed value (services are pre-paid upon package purchase).
          </p>
        </div>

        {/* Completed Tender Collections */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Payment Tender Realization
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Actual Net Inflow
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Cash Tenders
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(collections.cash)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Card Machines (POS)
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(collections.card)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                UPI / QR Pay
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(collections.upi)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Other Tenders
              </span>
              <div className="text-base font-bold font-mono text-foreground">
                {formatCurrency(collections.other)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
            <span className="font-semibold text-foreground">Total Realized Net Collections:</span>
            <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
              {formatCurrency(collections.netCollections)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
