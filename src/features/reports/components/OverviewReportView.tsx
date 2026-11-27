import React from "react";
import { AlertCircle, AlertTriangle, Info, TrendingUp, Sparkles } from "lucide-react";
import { ReportsOverviewResponse } from "../types/reports.types";
import { MetricCard } from "./MetricCard";

interface OverviewReportViewProps {
  data?: ReportsOverviewResponse;
  isLoading: boolean;
  onNavigateTab: (tab: string) => void;
}

export const OverviewReportView: React.FC<OverviewReportViewProps> = ({
  data,
  isLoading,
  onNavigateTab,
}) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary, operationalSignals, quickInsights } = data;

  return (
    <div className="space-y-6">
      {/* Top Level Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="cursor-pointer"
          onClick={() => onNavigateTab("revenue")}
          title="Click to view Revenue Report"
        >
          <MetricCard
            title="Net Sales Billed"
            metric={summary.netSalesBilled}
            isCurrency
            subtitle="Invoices finalized"
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => onNavigateTab("revenue")}
          title="Click to view Cash Collections"
        >
          <MetricCard
            title="Money Collected"
            metric={summary.moneyCollected}
            isCurrency
            subtitle="Net of refunds"
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => onNavigateTab("staff")}
          title="Click to view Staff Performance"
        >
          <MetricCard
            title="Completed Services"
            metric={summary.completedServices}
            subtitle="Chair-side execution"
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => onNavigateTab("retention")}
          title="Click to view Customer Retention"
        >
          <MetricCard
            title="Visiting Clients"
            metric={summary.totalVisitingClients}
            subtitle="Unique clients served"
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => onNavigateTab("retention")}
          title="Click to view Customer Retention"
        >
          <MetricCard
            title="Repeat Visit Rate"
            metric={summary.repeatVisitRate}
            isPercentage
            subtitle="Returning clientele"
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => onNavigateTab("inventory")}
          title="Click to view Inventory Report"
        >
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-muted-foreground">Low Stock SKUs</span>
              {summary.lowStockItemCount !== null && summary.lowStockItemCount > 0 && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Attention
                </span>
              )}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {summary.lowStockItemCount ?? "—"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Items at or below reorder level
            </div>
          </div>
        </div>
      </div>

      {/* Operational Signals Banner */}
      {operationalSignals && operationalSignals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operational Signals
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {operationalSignals.map((signal) => (
              <div
                key={signal.id}
                className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition ${
                  signal.type === "critical"
                    ? "border-rose-500/30 bg-rose-500/5 text-rose-950 dark:text-rose-100"
                    : signal.type === "warning"
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100"
                    : "border-sky-500/30 bg-sky-500/5 text-sky-950 dark:text-sky-100"
                }`}
              >
                {signal.type === "critical" && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                {signal.type === "warning" && (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                {signal.type === "info" && (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                )}

                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground">{signal.title}</div>
                  <p className="mt-0.5 text-muted-foreground">{signal.description}</p>
                </div>

                {signal.actionLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (signal.actionHref?.includes("revenue")) onNavigateTab("revenue");
                      else if (signal.actionHref?.includes("inventory")) onNavigateTab("inventory");
                    }}
                    className="shrink-0 rounded-lg bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                  >
                    {signal.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Insights Bullets */}
      {quickInsights && quickInsights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Executive Insights
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickInsights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/40 bg-card/80 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {insight.category}
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {insight.observation}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{insight.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
