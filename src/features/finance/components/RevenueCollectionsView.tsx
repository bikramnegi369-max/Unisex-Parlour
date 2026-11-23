"use client";

import React, { useState } from "react";
import { useOperatingProfit } from "../hooks";
import { formatCurrency } from "@/lib/formatters";
import { useBranchContext } from "@/hooks/useBranchContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  CircleDollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Calendar,
  RotateCcw,
  Sparkles,
  Info,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";

export default function RevenueCollectionsView() {
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
        title="Failed to Load Revenue Data"
        description="Could not retrieve invoiced revenue streams and tender collections."
        retryAction={{ label: "Retry", onClick: () => refetch() }}
      />
    );
  }

  const grossRevenue = report?.grossRevenue || 0;
  const refunds = report?.refunds || 0;
  const netRevenue = report?.netRevenue || 0;
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Date & Scope Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Revenue Period:</span>
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

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Scope:{" "}
            <strong className="text-foreground">
              {isAllBranchesSelected
                ? "All Salon Branches (Consolidated)"
                : currentBranch?.name}
            </strong>
          </span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 text-xs">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Primary KPI Row: Revenue vs Collections */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Gross Invoiced Revenue
          </span>
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatCurrency(grossRevenue)}
          </div>
          <span className="text-xs text-muted-foreground">
            Finalized Invoices: {report?.invoiceCount || 0}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-destructive">
            Customer Refunds
          </span>
          <div className="text-2xl font-bold font-mono text-destructive">
            -{formatCurrency(refunds)}
          </div>
          <span className="text-xs text-muted-foreground">Completed reversals</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Net Invoiced Revenue
          </span>
          <div className="text-2xl font-bold font-mono text-primary">
            {formatCurrency(netRevenue)}
          </div>
          <span className="text-xs text-muted-foreground">Gross Invoiced - Refunds</span>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Actual Cash Collected
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(collections.totalCollected)}
          </div>
          <span className="text-xs text-muted-foreground">
            Net Collections: {formatCurrency(collections.netCollections)}
          </span>
        </div>
      </div>

      {/* Accounting Notice: Revenue Recognition vs Collections */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs flex items-start gap-3 text-muted-foreground">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">Revenue Recognition vs Cash Collections:</strong>{" "}
          Invoiced revenue is recognized when services are billed and invoices finalized. Completed collections reflect cash, card, and UPI payments received by tenders during this period. Differences arise from advance package deposits, outstanding credit, or partial payments.
        </div>
      </div>

      {/* Two Panes: Stream Distribution vs Tender Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue Streams Breakdown */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Invoiced Revenue by Category
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              Total: {formatCurrency(grossRevenue)}
            </span>
          </div>

          <div className="space-y-3">
            {/* Services */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Salon Hair & Beauty Services</span>
                <span className="font-mono font-semibold">{formatCurrency(streams.services)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${grossRevenue > 0 ? (streams.services / grossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Retail Products */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Retail & Aftercare Products</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(streams.retailProducts)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${grossRevenue > 0 ? (streams.retailProducts / grossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Memberships */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">VIP Club Memberships</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(streams.memberships)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${grossRevenue > 0 ? (streams.memberships / grossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Subscriptions */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Recurring Service Subscriptions</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(streams.subscriptions)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${grossRevenue > 0 ? (streams.subscriptions / grossRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Collections Breakdown by Tender */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Actual Collections by Payment Tender
              </h3>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Total: {formatCurrency(collections.totalCollected)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Banknote className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">Physical Cash</span>
              </div>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(collections.cash)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">Credit/Debit Card</span>
              </div>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(collections.card)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">UPI & QR Pay</span>
              </div>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(collections.upi)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">Other Tenders</span>
              </div>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatCurrency(collections.other)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
