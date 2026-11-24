"use client";

import React from "react";
import Link from "next/link";
import { Award, Trophy, ArrowRight, Wallet, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffIntelligenceCardProps {
  incentives?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    accruedIncentives: number;
    topPerformers: Array<{ staffId: string; staffName: string; amount: number }>;
    error?: string;
  };
  payroll?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    pendingApprovalsCount: number;
    totalPendingPayable: number;
    error?: string;
  };
}

export function StaffIntelligenceCard({
  incentives,
  payroll,
}: StaffIntelligenceCardProps) {
  const hasIncentives = incentives && incentives.status !== "UNAVAILABLE";
  const hasPayroll = payroll && payroll.status !== "UNAVAILABLE";

  if (!hasIncentives && !hasPayroll) {
    return null;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <Trophy size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Stylist Incentives & Payroll
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Commission accruals, star stylists, and pending payroll releases
            </p>
          </div>
        </div>
        <Link
          href="/incentives"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 group"
        >
          <span>Incentives</span>
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2.5">
        {hasIncentives && (
          <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <span className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 block">
              Accrued Incentives
            </span>
            <span className="text-lg font-extrabold font-mono text-yellow-600 dark:text-yellow-400 mt-0.5 block">
              {formatCurrency(incentives.accruedIncentives || 0)}
            </span>
          </div>
        )}

        {hasPayroll && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground block">
              Pending Payroll ({payroll.pendingApprovalsCount})
            </span>
            <span className="text-lg font-extrabold font-mono text-foreground mt-0.5 block">
              {formatCurrency(payroll.totalPendingPayable || 0)}
            </span>
          </div>
        )}
      </div>

      {/* Star Stylists Leaderboard */}
      {hasIncentives && incentives.status === "AVAILABLE" && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Award size={12} className="text-yellow-500" />
            <span>Top Stylists By Commission</span>
          </div>

          {(incentives.topPerformers || []).length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">
              No commission entries recorded in this period
            </div>
          ) : (
            <div className="space-y-1.5">
              {incentives.topPerformers.slice(0, 4).map((staff, idx) => (
                <div
                  key={staff.staffId || idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-bold font-mono",
                        idx === 0
                          ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-foreground">
                      {staff.staffName}
                    </span>
                  </div>
                  <span className="font-bold font-mono text-foreground">
                    {formatCurrency(staff.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
