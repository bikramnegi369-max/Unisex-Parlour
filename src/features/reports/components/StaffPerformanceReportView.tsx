import React from "react";
import { StaffPerformanceReportResponse } from "../types/reports.types";
import { MetricCard } from "./MetricCard";
import { Award, Clock, DollarSign, CheckCircle2 } from "lucide-react";

interface StaffPerformanceReportViewProps {
  data?: StaffPerformanceReportResponse;
  isLoading: boolean;
}

export const StaffPerformanceReportView: React.FC<StaffPerformanceReportViewProps> = ({
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

  const { summary, rankings = [] } = data;

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Completed Services"
          metric={summary.totalServicesDelivered}
          subtitle="Deduplicated execution count"
        />
        <MetricCard
          title="Chair Time Hours"
          metric={summary.totalChairTimeHours}
          subtitle="Total chair time spent"
        />
        <MetricCard
          title="Service Revenue Attributed"
          metric={summary.serviceRevenueGenerated}
          isCurrency
          subtitle="Billed services credit"
        />
        <MetricCard
          title="Retail Sales Attributed"
          metric={summary.retailSalesGenerated}
          isCurrency
          subtitle="Over-the-counter products"
        />
      </div>

      {/* 2. Staff Leaderboard & Rankings */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stylist & Staff Performance Leaderboard ({rankings.length} staff members)
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Counts reflect chair-side completed services (including unbilled); revenue reflects
            authoritatively billed attribution.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Rank & Staff</th>
                <th className="px-4 py-3 font-medium text-center">Services Completed</th>
                <th className="px-4 py-3 font-medium text-center">Chair Time</th>
                <th className="px-4 py-3 font-medium text-right">Service Credit</th>
                <th className="px-4 py-3 font-medium text-right">Retail Credit</th>
                <th className="px-4 py-3 font-medium text-right">Total Revenue Credit</th>
                <th className="px-4 py-3 font-medium text-right">Avg Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No staff execution activity recorded in this period.
                  </td>
                </tr>
              ) : (
                rankings.map((staff, index) => (
                  <tr key={staff.staffId} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                            index === 0
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : index === 1
                              ? "bg-slate-300/40 text-slate-700 dark:text-slate-300"
                              : index === 2
                              ? "bg-amber-700/20 text-amber-800 dark:text-amber-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{staff.name}</div>
                          <div className="text-[10px] text-muted-foreground">{staff.staffCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-foreground">
                      {staff.servicesCompletedCount}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {(staff.serviceHours || 0).toFixed(1)} hrs
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ₹{(staff.serviceRevenueCredit || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      ₹{(staff.retailSalesCredit || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      ₹{(staff.totalRevenueCredit || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                      ₹{(staff.averageTicket || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
