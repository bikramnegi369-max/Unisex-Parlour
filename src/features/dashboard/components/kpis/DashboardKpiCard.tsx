"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from "lucide-react";
import { MetricDelta, RateDelta } from "../../types/dashboard.types";
import { cn } from "@/lib/utils";

interface DashboardKpiCardProps {
  title: string;
  value: string;
  delta?: MetricDelta | RateDelta | null;
  subtitle?: string;
  icon: LucideIcon;
  href?: string;
  badgeColor?: "primary" | "emerald" | "amber" | "rose" | "purple" | "blue";
  tooltip?: string;
}

export function DashboardKpiCard({
  title,
  value,
  delta,
  subtitle,
  icon: Icon,
  href,
  badgeColor = "primary",
  tooltip,
}: DashboardKpiCardProps) {
  const colorStyles = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    amber: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
    rose: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
    purple: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
    blue: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
  };

  const trendIcon =
    delta?.trend === "up" ? (
      <ArrowUpRight size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
    ) : delta?.trend === "down" ? (
      <ArrowDownRight size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
    ) : (
      <Minus size={13} className="shrink-0 text-muted-foreground" />
    );

  const percentageDisplay =
    delta && "percentageChange" in delta && delta.percentageChange !== null
      ? `${delta.percentageChange > 0 ? "+" : ""}${delta.percentageChange}%`
      : delta && "percentagePointsChange" in delta && delta.percentagePointsChange !== null
      ? `${delta.percentagePointsChange > 0 ? "+" : ""}${delta.percentagePointsChange} pp`
      : null;

  const content = (
    <div
      className={cn(
        "relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-md transition-all duration-200 group select-none",
        href && "cursor-pointer hover:border-primary/40"
      )}
      title={tooltip}
    >
      {/* Top row: Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground truncate uppercase tracking-wider">
          {title}
        </span>
        <div className={cn("p-2 rounded-xl transition-colors", colorStyles[badgeColor])}>
          <Icon size={16} />
        </div>
      </div>

      {/* Middle row: Big Metric Value */}
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
          {value}
        </div>
      </div>

      {/* Bottom row: Delta & Comparison Context */}
      <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-muted-foreground">
        {percentageDisplay ? (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[11px]",
              delta?.trend === "up"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : delta?.trend === "down"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {trendIcon}
            <span>{percentageDisplay}</span>
          </div>
        ) : null}

        <span className="truncate text-muted-foreground/80">{subtitle || "vs. previous period"}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
