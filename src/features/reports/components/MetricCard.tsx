import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { MetricWithComparison } from "../types/reports.types";

interface MetricCardProps {
  title: string;
  metric: MetricWithComparison;
  isCurrency?: boolean;
  isPercentage?: boolean;
  subtitle?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  metric,
  isCurrency = false,
  isPercentage = false,
  subtitle,
  className = "",
}) => {
  const formatVal = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    if (isCurrency) return `₹${val.toLocaleString("en-IN")}`;
    if (isPercentage) return `${val}%`;
    return val.toLocaleString("en-IN");
  };

  const getDeltaBadge = () => {
    if (metric.percentageChange !== undefined && metric.percentageChange !== null) {
      const isPositive = metric.percentageChange > 0;
      const isNegative = metric.percentageChange < 0;
      return (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : isNegative
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3" />
          ) : isNegative ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {Math.abs(metric.percentageChange)}%
        </span>
      );
    }

    if (metric.percentagePointsChange !== undefined && metric.percentagePointsChange !== null) {
      const isPositive = metric.percentagePointsChange > 0;
      const isNegative = metric.percentagePointsChange < 0;
      return (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
            isPositive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : isNegative
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isPositive ? "+" : ""}
          {metric.percentagePointsChange} pp
        </span>
      );
    }

    return null;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition hover:shadow-md ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {getDeltaBadge()}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {formatVal(metric.current)}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{subtitle || "Current period"}</span>
        {metric.previous !== null && metric.previous !== undefined && (
          <span>Prev: {formatVal(metric.previous)}</span>
        )}
      </div>
    </div>
  );
};
