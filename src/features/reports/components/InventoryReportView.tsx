import React from "react";
import { InventoryReportResponse } from "../types/reports.types";
import { MetricCard } from "./MetricCard";
import { AlertTriangle, Package, History } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

interface InventoryReportViewProps {
  data?: InventoryReportResponse;
  isLoading: boolean;
  onLowStockPageChange: (page: number) => void;
  onLowStockPageSizeChange: (pageSize: number) => void;
  onMovementPageChange: (page: number) => void;
  onMovementPageSizeChange: (pageSize: number) => void;
}

export const InventoryReportView: React.FC<InventoryReportViewProps> = ({
  data,
  isLoading,
  onLowStockPageChange,
  onLowStockPageSizeChange,
  onMovementPageChange,
  onMovementPageSizeChange,
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

  const { summary, lowStockAlerts = [], movementLogs = [], pagination } = data;

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Tracked Catalog SKUs</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {summary.totalTrackedSkuCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Active products in branch</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Consumables Low Stock
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-100">
            {summary.lowStockConsumablesCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
            Internal salon back-bar supplies
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-sm">
          <div className="text-xs font-medium text-rose-800 dark:text-rose-300">
            Retail Low Stock
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-900 dark:text-rose-100">
            {summary.lowStockRetailCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
            Over-the-counter sales products
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Stocktake Discrepancy</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {(summary.auditNetDiscrepancyDelta || 0) >= 0 ? "+" : ""}
            {summary.auditNetDiscrepancyDelta || 0}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Net audit unit variance</div>
        </div>
      </div>

      {/* 2. Low Stock Alerts Table */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critical Low Stock Warnings ({pagination.lowStockAlerts.total})
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Separated by back-bar consumable stock vs. front-desk retail shelf inventory.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product / SKU</th>
                <th className="px-4 py-3 font-medium">Usage Type</th>
                <th className="px-4 py-3 font-medium text-center">Consumables Stock</th>
                <th className="px-4 py-3 font-medium text-center">Retail Stock</th>
                <th className="px-4 py-3 font-medium text-center">Reorder Level</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {lowStockAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    All inventory levels are currently above reorder thresholds.
                  </td>
                </tr>
              ) : (
                lowStockAlerts.map((alert) => (
                  <tr key={alert.stockBalanceId} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{alert.name}</div>
                      <div className="text-[10px] text-muted-foreground">{alert.sku}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {alert.usageType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-amber-600 dark:text-amber-400">
                      {alert.onHandConsumables || 0}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">
                      {alert.onHandRetail || 0}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {alert.reorderLevel || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          alert.urgency === "critical"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {alert.urgency}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination.lowStockAlerts.total > 0 && (
          <Pagination
            currentPage={pagination.lowStockAlerts.page}
            totalPages={pagination.lowStockAlerts.totalPages}
            totalItems={pagination.lowStockAlerts.total}
            pageSize={pagination.lowStockAlerts.limit}
            itemLabel="low-stock alerts"
            onPageChange={onLowStockPageChange}
            onPageSizeChange={onLowStockPageSizeChange}
          />
        )}
      </div>

      {/* 3. Movement Activity Log */}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border/40 px-5 py-4">
          <History className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inventory Movement Audit Log ({pagination.movementLogs.total} entries)
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Direct movements (receipts, consumptions, sales, corrections) within selected period.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/40 bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Movement Type</th>
                <th className="px-4 py-3 font-medium text-center">Domain</th>
                <th className="px-4 py-3 font-medium text-right">Quantity Delta</th>
                <th className="px-4 py-3 font-medium text-right">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {movementLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No inventory movements recorded in this date range.
                  </td>
                </tr>
              ) : (
                movementLogs.map((log) => {
                  const mType = (log.movementType || "movement").replace(/_/g, " ");
                  const qDelta = log.quantityDelta || 0;
                  return (
                    <tr key={log.movementId} className="transition hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{log.productName || "Product"}</span>
                        <span className="ml-1 text-[10px] text-muted-foreground">({log.sku || "N/A"})</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-foreground">{mType}</span>
                      </td>
                      <td className="px-4 py-3 text-center uppercase text-muted-foreground">
                        {log.stockDomain || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          qDelta > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {qDelta > 0 ? "+" : ""}
                        {qDelta}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{log.notes || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pagination.movementLogs.total > 0 && (
          <Pagination
            currentPage={pagination.movementLogs.page}
            totalPages={pagination.movementLogs.totalPages}
            totalItems={pagination.movementLogs.total}
            pageSize={pagination.movementLogs.limit}
            itemLabel="movements"
            onPageChange={onMovementPageChange}
            onPageSizeChange={onMovementPageSizeChange}
          />
        )}
      </div>
    </div>
  );
};
