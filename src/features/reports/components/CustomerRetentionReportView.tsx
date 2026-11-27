import React from "react";
import { CustomerRetentionReportResponse } from "../types/reports.types";
import { MetricCard } from "./MetricCard";
import { Info, UserCheck, Clock, AlertTriangle, UserX } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

interface CustomerRetentionReportViewProps {
  data?: CustomerRetentionReportResponse;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export const CustomerRetentionReportView: React.FC<CustomerRetentionReportViewProps> = ({
  data,
  isLoading,
  onPageChange,
  onPageSizeChange,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    summary,
    recencyBuckets = { active: 0, dueForService: 0, atRisk: 0, lapsed: 0 },
    visitFrequencyDistribution = [],
    clientDirectory = [],
    pagination,
  } = data;

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "active":
        return (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            Active (0–45d)
          </span>
        );
      case "dueForService":
        return (
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
            Due for Service (46–75d)
          </span>
        );
      case "atRisk":
        return (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            At-Risk (76–105d)
          </span>
        );
      case "lapsed":
        return (
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            Lapsed (&gt;105d)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Completeness Indicator Banner */}
      {summary?.historyCompletenessNote && (
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 text-xs text-sky-950 dark:text-sky-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <span className="font-semibold">Visit History Notice: </span>
            {summary.historyCompletenessNote}
          </div>
        </div>
      )}

      {/* 2. Top Level Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Visiting Clients"
          metric={summary.totalVisitingClients}
          subtitle="Served during this period"
        />
        <MetricCard
          title="Repeat Visit Rate"
          metric={summary.repeatVisitRate}
          isPercentage
          subtitle="Visited 2+ times historically"
        />
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">At-Risk Clients</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {summary.atRiskClientsCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            No salon visits for 76–105 days
          </div>
        </div>
      </div>

      {/* 3. Operational Recency Buckets */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Client Recency Segments (Operational Follow-up)
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <span>Active</span>
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-bold text-foreground">{recencyBuckets.active || 0}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Visited in last 0–45 days</div>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-sky-800 dark:text-sky-300">
              <span>Due for Service</span>
              <Clock className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-bold text-foreground">
              {recencyBuckets.dueForService || 0}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">Last visit 46–75 days ago</div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-amber-800 dark:text-amber-300">
              <span>At-Risk</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-bold text-foreground">{recencyBuckets.atRisk || 0}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">Last visit 76–105 days ago</div>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
            <div className="flex items-center justify-between text-xs font-medium text-rose-800 dark:text-rose-300">
              <span>Lapsed</span>
              <UserX className="h-4 w-4" />
            </div>
            <div className="mt-2 text-xl font-bold text-foreground">{recencyBuckets.lapsed || 0}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">No visits for &gt;105 days</div>
          </div>
        </div>
      </div>

      {/* 4. Visit Frequency Distribution */}
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Historical Visit Frequency Distribution
        </h4>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {visitFrequencyDistribution.map((dist) => (
            <div key={dist.frequencyTier} className="rounded-lg bg-muted/40 p-3 text-xs">
              <div className="text-muted-foreground">{dist.frequencyTier}</div>
              <div className="mt-1 text-lg font-bold text-foreground">{dist.clientCount}</div>
              <div className="text-[11px] text-muted-foreground">
                {dist.percentageOfTotal}% of clientele
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Client Directory Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/40 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Client Recency Directory
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Phone numbers are server-side masked unless authorized with customer view rights.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Customer Name</th>
                <th className="px-4 py-3 font-medium">Phone Number</th>
                <th className="px-4 py-3 font-medium">Last Visit Date</th>
                <th className="px-4 py-3 font-medium text-center">Days Since Visit</th>
                <th className="px-4 py-3 font-medium text-center">Lifetime Visits</th>
                <th className="px-4 py-3 font-medium text-right">Status Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {clientDirectory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No customer visit records found.
                  </td>
                </tr>
              ) : (
                clientDirectory.map((client) => (
                  <tr key={client.customerId} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{client.name}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{client.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {client.lastVisitDate || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-foreground">
                      {client.daysSinceLastVisit !== null && client.daysSinceLastVisit !== undefined
                        ? `${client.daysSinceLastVisit}d`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-foreground">
                      {client.totalLifetimeVisits}
                    </td>
                    <td className="px-4 py-3 text-right">{getTierBadge(client.statusTier)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination.clientDirectory.total > 0 && (
          <Pagination
            currentPage={pagination.clientDirectory.page}
            totalPages={pagination.clientDirectory.totalPages}
            totalItems={pagination.clientDirectory.total}
            pageSize={pagination.clientDirectory.limit}
            itemLabel="customers"
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>
    </div>
  );
};
