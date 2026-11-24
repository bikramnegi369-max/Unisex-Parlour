"use client";

import React from "react";
import Link from "next/link";
import { Users, UserPlus, Repeat, ArrowRight, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerIntelligenceCardProps {
  customers: {
    totalActiveCustomers: number;
    newCustomersInPeriod: number;
    repeatCustomerRate: number;
    acquisitionSources: Array<{ source: string; count: number }>;
    newVsReturning: { new: number; returning: number };
  };
}

export function CustomerIntelligenceCard({ customers }: CustomerIntelligenceCardProps) {
  const {
    totalActiveCustomers,
    newCustomersInPeriod,
    repeatCustomerRate,
    acquisitionSources,
    newVsReturning,
  } = customers;

  const totalInPeriod = (newVsReturning.new || 0) + (newVsReturning.returning || 0);
  const newPct = totalInPeriod > 0 ? Math.round((newVsReturning.new / totalInPeriod) * 100) : 0;
  const retPct = totalInPeriod > 0 ? 100 - newPct : 0;

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Customer Retention & Channels
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Client acquisition, loyalty velocity, and retention health
            </p>
          </div>
        </div>
        <Link
          href="/customers"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 group"
        >
          <span>Directory</span>
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Primary Metrics Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-center">
          <span className="text-[10px] font-semibold text-muted-foreground block">
            Total Active Base
          </span>
          <span className="text-base sm:text-lg font-extrabold text-foreground font-mono">
            {totalActiveCustomers.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block">
            New Clients
          </span>
          <span className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            +{newCustomersInPeriod}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
            Repeat Rate
          </span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {repeatCustomerRate}%
          </span>
        </div>
      </div>

      {/* New vs Returning Ratio Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 font-semibold text-foreground text-[11px]">
            <UserPlus size={12} className="text-blue-500" />
            <span>New: {newVsReturning.new} ({newPct}%)</span>
          </span>
          <span className="flex items-center gap-1 font-semibold text-foreground text-[11px]">
            <Repeat size={12} className="text-emerald-500" />
            <span>Returning: {newVsReturning.returning} ({retPct}%)</span>
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${newPct}%` }}
            title={`New Clients: ${newPct}%`}
          />
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${retPct}%` }}
            title={`Returning Clients: ${retPct}%`}
          />
        </div>
      </div>

      {/* Acquisition Sources Channels */}
      <div className="space-y-2 pt-1 border-t border-border/40">
        <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          <Share2 size={11} />
          <span>Acquisition Channels</span>
        </div>

        {acquisitionSources.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No source tags registered in this period
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {acquisitionSources.map((item) => (
              <div
                key={item.source}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40 text-xs"
              >
                <span className="font-medium text-foreground capitalize truncate">
                  {item.source.replace("_", " ")}
                </span>
                <span className="font-bold text-foreground font-mono bg-background px-1.5 py-0.5 rounded text-[11px] border border-border/60">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
