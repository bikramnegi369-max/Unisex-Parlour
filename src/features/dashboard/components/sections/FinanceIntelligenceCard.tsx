"use client";

import React from "react";
import Link from "next/link";
import { Landmark, ArrowRight, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinanceIntelligenceCardProps {
  finance?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    totalExpenses: number;
    operatingCashMargin?: number;
    expensesByCategory: Array<{ category: string; amount: number }>;
    error?: string;
  };
}

export function FinanceIntelligenceCard({ finance }: FinanceIntelligenceCardProps) {
  if (!finance || finance.status === "UNAVAILABLE") {
    return null; // Omit widget gracefully when user lacks finance permissions
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (finance.status === "FAILED") {
    return (
      <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-rose-500/30 shadow-2xs select-none space-y-3">
        <div className="flex items-center gap-2 text-rose-500">
          <AlertCircle size={16} />
          <h3 className="text-sm font-bold">Finance Intelligence Unavailable</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {finance.error || "Expense aggregation failed for the requested date range."}
        </p>
      </div>
    );
  }

  const { totalExpenses, operatingCashMargin, expensesByCategory } = finance;
  const hasMargin = typeof operatingCashMargin === "number" && Number.isFinite(operatingCashMargin);
  const isMarginPositive = hasMargin ? operatingCashMargin >= 0 : true;

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Landmark size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Cash Flow & Expenses
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Operating cash margin (Collections minus approved operational expenses)
            </p>
          </div>
        </div>
        <Link
          href="/expenses"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 group"
        >
          <span>Expenses</span>
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Primary Financial Margin Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hasMargin ? (
          <div
            className={cn(
              "p-3.5 rounded-xl border flex flex-col justify-between",
              isMarginPositive
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-rose-500/5 border-rose-500/20"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Operating Cash Margin
              </span>
              {isMarginPositive ? (
                <TrendingUp size={14} className="text-emerald-500" />
              ) : (
                <TrendingDown size={14} className="text-rose-500" />
              )}
            </div>
            <span
              className={cn(
                "text-lg sm:text-xl font-extrabold font-mono mt-1",
                isMarginPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {formatCurrency(operatingCashMargin)}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              Liquid collections net of salon outlays
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 flex flex-col justify-center">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Operating Cash Margin
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Requires finance.view permission
            </span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">
            Total Approved Expenses
          </span>
          <span className="text-lg sm:text-xl font-extrabold font-mono text-foreground mt-1">
            {formatCurrency(totalExpenses)}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            Operating overheads in period
          </span>
        </div>
      </div>

      {/* Expense Categories Breakdown */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Top Overhead Categories
        </div>

        {expensesByCategory.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No expenses recorded for this period
          </div>
        ) : (
          <div className="space-y-1.5">
            {expensesByCategory.slice(0, 4).map((item) => {
              const pct =
                totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0;
              return (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground capitalize">
                      {item.category.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      ({pct}%)
                    </span>
                  </div>
                  <span className="font-bold font-mono text-foreground">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
