"use client";

import React, { useState } from "react";
import { useFinanceAuditHistory } from "../hooks";
import { FinanceAuditItem } from "../types/finance.types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState } from "@/components/ui/error-state";
import {
  History,
  CheckCircle2,
  Eye,
  XCircle,
  Store,
  Receipt,
  Wallet,
} from "lucide-react";

export default function FinanceAuditHistoryView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [entityType, setEntityType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [inspectItem, setInspectItem] = useState<FinanceAuditItem | null>(null);

  const { data, isLoading, isError, refetch } = useFinanceAuditHistory({
    page,
    limit,
    entityType: entityType || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const items = data?.items || [];
  const pagination = data?.pagination;

  const getEntityBadge = (type: string) => {
    switch (type) {
      case "day_closure":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
            <Store className="h-3 w-3" />
            Day Closure
          </span>
        );
      case "expense":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[11px]">
            <Receipt className="h-3 w-3" />
            Expense
          </span>
        );
      case "petty_cash":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
            <Wallet className="h-3 w-3" />
            Petty Cash
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono text-[11px]">
            {type}
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes("approved")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
          <CheckCircle2 className="h-3 w-3" />
          {action}
        </span>
      );
    }
    if (action.includes("rejected")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold text-[11px]">
          <XCircle className="h-3 w-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground font-medium text-[11px]">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters & Search Toolbar */}
      <div className="bg-card p-5 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Financial Audit History & Sign-Off Trail
              </h2>
              <p className="text-xs text-muted-foreground">
                Immutable chronological log of daily register sign-offs, expense
                approvals/rejections, and drawer replenishments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-mono">
              Auditor Grade
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border/60">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            >
              <option value="">All Financial Entities</option>
              <option value="day_closure">Day Closures</option>
              <option value="expense">Operating Expenses</option>
              <option value="petty_cash">Petty Cash Movements</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEntityType("");
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="w-full text-xs h-9"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Notes / Reason</th>
                <th className="py-3 px-4 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Loading financial audit history...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <ErrorState
                      title="Failed to load audit history"
                      description="Could not fetch financial audit events. Please try again."
                      retryAction={{
                        label: "Retry",
                        onClick: () => refetch(),
                      }}
                    />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No financial audit records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                items.map((item: FinanceAuditItem) => (
                  <tr
                    key={item.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {getEntityBadge(item.entityType)}
                    </td>
                    <td className="py-3 px-4">{getActionBadge(item.action)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {item.actorName}
                        </span>
                        {item.actorEmail && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.actorEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground font-medium">
                      {item.referenceNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {item.amount !== undefined && item.amount !== null
                        ? formatCurrency(item.amount)
                        : "--"}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                      {item.noteOrReason || "--"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectItem(item)}
                        className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg border-border/80 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={pagination.page}
              totalPages={Math.max(1, pagination.totalPages)}
              totalItems={pagination.total}
              onPageChange={setPage}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageSizeChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              itemLabel="audit events"
            />
          </div>
        )}
      </div>

      {/* Inspect Dialog */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Audit Event Deep Inspection
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectItem(null)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Entity Type
                  </span>
                  <span className="font-semibold">
                    {inspectItem.entityType}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Action
                  </span>
                  <span className="font-semibold">{inspectItem.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Actor
                  </span>
                  <span className="font-semibold">{inspectItem.actorName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Timestamp
                  </span>
                  <span className="font-mono text-[11px]">
                    {new Date(inspectItem.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Reference #
                  </span>
                  <span className="font-mono">
                    {inspectItem.referenceNumber}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Amount
                  </span>
                  <span className="font-mono font-bold">
                    {inspectItem.amount !== undefined
                      ? formatCurrency(inspectItem.amount)
                      : "N/A"}
                  </span>
                </div>
              </div>

              {inspectItem.noteOrReason && (
                <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground block">
                    Recorded Note / Reason:
                  </span>
                  <p className="text-foreground">{inspectItem.noteOrReason}</p>
                </div>
              )}

              {inspectItem.details &&
                Object.keys(inspectItem.details).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Payload Metadata:
                    </span>
                    <pre className="p-3 bg-muted/60 rounded-xl font-mono text-[11px] overflow-x-auto text-foreground">
                      {JSON.stringify(inspectItem.details, null, 2)}
                    </pre>
                  </div>
                )}
            </div>

            <div className="pt-2">
              <Button
                onClick={() => setInspectItem(null)}
                className="w-full text-xs"
              >
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
