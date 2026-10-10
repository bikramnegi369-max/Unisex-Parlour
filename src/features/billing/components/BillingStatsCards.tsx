"use client";

import React, { useMemo } from "react";
import { formatCurrency } from "@/lib/formatters";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import type {
  Invoice,
  CustomerBillingSummary,
} from "../types/billing.types";

interface BillingStatsCardsProps {
  invoices: Invoice[];
  summary?: CustomerBillingSummary;
  totalRecords?: number;
  filterLabel?: string;
  isLoading?: boolean;
  isRefreshing?: boolean;
}

export function BillingStatsCards({
  invoices,
  summary,
  totalRecords,
  filterLabel,
  isLoading,
  isRefreshing = false,
}: BillingStatsCardsProps) {
  const stats = useMemo(() => {
    // 1. If backend supplies global aggregated summary in meta.summary, use it as primary source of truth
    if (summary) {
      // Calculate draft count or unpaid count from current set as contextual indicators
      let draftCount = 0;
      let unpaidCount = 0;
      for (const inv of invoices) {
        if (inv.status === "draft") draftCount++;
        if (inv.status === "finalized" && inv.amountDue > 0) unpaidCount++;
      }

      // Compute fallback plan savings from loaded records if backend omits totalPlanWaived
      const pagePlanSavings = invoices.reduce(
        (sum, inv) => sum + (inv.status !== "cancelled" ? inv.subscriptionCoveredAmount || 0 : 0),
        0,
      );

      return {
        totalBilled: summary.totalBilled,
        totalCollected: summary.totalPaid,
        totalOutstanding: summary.totalOutstanding,
        planSavings:
          typeof summary.totalPlanWaived === "number"
            ? summary.totalPlanWaived
            : pagePlanSavings,
        draftCount,
        unpaidCount,
        totalCount: totalRecords ?? summary.totalInvoices,
        isGlobalAggregate: true,
      };
    }

    // 2. Fallback to client-side page summation if backend omits meta.summary
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let planSavings = 0;
    let draftCount = 0;
    let unpaidCount = 0;

    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;

      totalBilled += inv.payableAmount || 0;
      totalCollected += inv.amountPaid || 0;
      totalOutstanding += inv.amountDue || 0;
      planSavings += inv.subscriptionCoveredAmount || 0;

      if (inv.status === "draft") {
        draftCount++;
      }
      if (inv.status === "finalized" && inv.amountDue > 0) {
        unpaidCount++;
      }
    }

    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      planSavings,
      draftCount,
      unpaidCount,
      totalCount: totalRecords ?? invoices.length,
      isGlobalAggregate: false,
    };
  }, [invoices, summary, totalRecords]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3.5 bg-card border border-border/80 rounded-xl space-y-2.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted/60 rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted/40 rounded-full animate-pulse" />
            </div>
            <div className="h-6 w-28 bg-muted/70 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-muted/40 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-opacity duration-200 ${
        isRefreshing ? "opacity-75" : "opacity-100"
      }`}
    >
      {/* Total Billed */}
      <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Total Invoiced
          </span>
          <Receipt className="h-4 w-4 text-primary" />
        </div>
        <p className="text-lg font-black tracking-tight text-foreground">
          {formatCurrency(stats.totalBilled)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {stats.totalCount} total invoice{stats.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Collected */}
      <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Collected
          </span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-black tracking-tight text-emerald-600 dark:text-emerald-400">
          {formatCurrency(stats.totalCollected)}
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          Cash, Card & UPI received
        </p>
      </div>

      {/* Outstanding Dues */}
      <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Outstanding Due
          </span>
          <AlertCircle
            className={`h-4 w-4 ${stats.totalOutstanding > 0 ? "text-primary" : "text-muted-foreground"}`}
          />
        </div>
        <p
          className={`text-lg font-black tracking-tight ${
            stats.totalOutstanding > 0 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {formatCurrency(stats.totalOutstanding)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {stats.unpaidCount} invoice{stats.unpaidCount === 1 ? "" : "s"} with dues
        </p>
      </div>

      {/* Subscription Waived & Drafts */}
      <div className="p-3.5 bg-card border border-border/80 rounded-xl space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Plan Waived Value
          </span>
          <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="text-lg font-black tracking-tight text-purple-600 dark:text-purple-400">
          {formatCurrency(stats.planSavings)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {stats.draftCount} pending draft{stats.draftCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
