"use client";

import React from "react";
import { GitCompare, Building2, TrendingUp } from "lucide-react";
import { BranchComparisonItem } from "../../types/dashboard.types";

interface BranchComparisonCardProps {
  branches?: BranchComparisonItem[];
}

export function BranchComparisonCard({ branches }: BranchComparisonCardProps) {
  if (!branches || branches.length <= 1) {
    return null; // Omit if single branch or no multi-branch comparison available
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalRevenue = branches.reduce((acc, b) => acc + b.billedRevenue, 0);

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <GitCompare size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Multi-Branch Performance Comparison
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Cross-location revenue benchmarking and volume share
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono">
          {branches.length} Branches Active
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="pb-2">Branch Location</th>
              <th className="pb-2 text-right">Billed Sales</th>
              <th className="pb-2 text-right">Net Collections</th>
              <th className="pb-2 text-right">Appointments</th>
              <th className="pb-2 text-right">Volume Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {branches.map((b) => {
              const share = totalRevenue > 0 ? Math.round((b.billedRevenue / totalRevenue) * 100) : 0;
              return (
                <tr key={b.branchId} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 size={13} className="text-muted-foreground" />
                    <span>{b.branchName}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-foreground">
                    {formatCurrency(b.billedRevenue)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(b.collections)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-muted-foreground">
                    {b.appointmentsCount}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                    {share}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
