import React from "react";
import { ServiceAnalyticsReportResponse } from "../types/reports.types";
import { MetricCard } from "./MetricCard";
import { Scissors, Clock, TrendingUp } from "lucide-react";

interface ServiceAnalyticsReportViewProps {
  data?: ServiceAnalyticsReportResponse;
  isLoading: boolean;
}

export const ServiceAnalyticsReportView: React.FC<ServiceAnalyticsReportViewProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, topServices, categoryShare } = data;

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Services Completed"
          metric={summary.totalServicesCompleted}
          subtitle="Services performed in period"
        />
        <MetricCard
          title="Average Service Ticket"
          metric={summary.averageServiceTicket}
          isCurrency
          subtitle="Revenue per completed service"
        />
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Most Requested Service</div>
          <div className="mt-2 truncate text-lg font-bold text-foreground">
            {summary.mostRequestedServiceName || "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Highest volume demand</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Top Revenue Category</div>
          <div className="mt-2 truncate text-lg font-bold text-foreground">
            {summary.topRevenueCategoryName || "—"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Highest billing share</div>
        </div>
      </div>

      {/* 2. Top Services Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Service Demand & Revenue Rankings
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ranked by total execution count and contribution to gross service revenue.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Rank & Service</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-center">Executed Count</th>
                <th className="px-4 py-3 font-medium text-center">Avg Duration</th>
                <th className="px-4 py-3 font-medium text-right">Gross Revenue</th>
                <th className="px-4 py-3 font-medium text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No services executed in this date range.
                  </td>
                </tr>
              ) : (
                topServices.map((svc, idx) => (
                  <tr key={svc.serviceId + idx} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground">{svc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{svc.category}</td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">
                      {svc.executionCount}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {svc.averageDurationMinutes} min
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      ₹{svc.totalGrossRevenue.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {svc.percentageContribution}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Category Share Breakdown */}
      {categoryShare && categoryShare.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category Demand Share
          </h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryShare.map((cat) => (
              <div key={cat.category} className="rounded-lg bg-muted/40 p-4 text-xs">
                <div className="font-semibold text-foreground">{cat.category}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-muted-foreground">{cat.executionCount} completed</span>
                  <span className="text-sm font-bold text-foreground">
                    ₹{cat.revenue.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(0, cat.percentageShare))}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[10px] text-muted-foreground">
                  {cat.percentageShare}% of service revenue
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
