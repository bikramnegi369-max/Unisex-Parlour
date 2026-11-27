"use client";

import React, { useState } from "react";
import { useDayClosures } from "../hooks";
import { DayClosure } from "../types/finance.types";
import { FINANCE_CONFIG } from "../config/finance.config";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Check,
  Receipt,
} from "lucide-react";
import ClosureDetailsModal from "./ClosureDetailsModal";

export default function ClosureHistoryTable() {
  const { user } = useAuth();
  const canApprove = hasPermission(user, FINANCE_CONFIG.permissions.edit);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    FINANCE_CONFIG.defaults.pageSize,
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<string>("");
  const [reconciliationResult, setReconciliationResult] = useState<string>("");

  const [selectedClosure, setSelectedClosure] = useState<DayClosure | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Canonical Query Hook
  const { data, isLoading, isError, refetch } = useDayClosures({
    page,
    limit: pageSize,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    status: status || undefined,
    reconciliationResult: reconciliationResult || undefined,
  });

  const handleOpenDetails = (closure: DayClosure) => {
    setSelectedClosure(closure);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedClosure(null);
  };

  const closures = data?.items || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-wrap gap-3 items-center justify-between shadow-xs">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              From:
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-34 h-9 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              To:
            </span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-34 h-9 text-xs font-mono"
            />
          </div>

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-32 h-9 text-xs"
          >
            <option value="">All Review States</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved & Locked</option>
          </Select>

          <Select
            value={reconciliationResult}
            onChange={(e) => {
              setReconciliationResult(e.target.value);
              setPage(1);
            }}
            className="w-36 h-9 text-xs"
          >
            <option value="">All Verification Results</option>
            <option value="balanced">Balanced (Exact)</option>
            <option value="discrepant">Has Difference</option>
          </Select>
        </div>

        {(startDate || endDate || status || reconciliationResult) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setStatus("");
              setReconciliationResult("");
              setPage(1);
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Closures Table Card */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {isError ? (
          <ErrorState
            title="Unable to Load Closure Records"
            description="We encountered an issue fetching historical register closures. Please try again."
            retryAction={{
              label: "Reload",
              onClick: () => refetch(),
              isLoading,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="px-5 py-3">Business Date</th>
                  <th className="px-5 py-3">System Expected</th>
                  <th className="px-5 py-3">Physical Counted</th>
                  <th className="px-5 py-3">Net Difference</th>
                  <th className="px-5 py-3">Count Verification</th>
                  <th className="px-5 py-3">Review Status</th>
                  <th className="px-5 py-3">Submitted By</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2" />
                      Loading closure history...
                    </td>
                  </tr>
                ) : closures.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12">
                      <EmptyState
                        icon={Receipt}
                        title="No Register Closures Recorded"
                        description="No daily drawer closures match your search or branch selection."
                      />
                    </td>
                  </tr>
                ) : (
                  closures.map((closure) => {
                    const isBalanced =
                      closure.reconciliationResult === "balanced";
                    const isApproved = closure.status === "approved";
                    const totalDelta = closure.discrepancy?.totalDelta || 0;

                    return (
                      <tr
                        key={closure.id}
                        onClick={() => handleOpenDetails(closure)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono font-semibold">
                              {closure.businessDate}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-foreground font-mono">
                          {formatCurrency(
                            closure.systemTotals?.netExpected || 0,
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-foreground font-mono font-semibold">
                          {formatCurrency(
                            closure.physicalCounts?.totalCounted || 0,
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold">
                          <span
                            className={
                              totalDelta === 0
                                ? "text-muted-foreground"
                                : totalDelta > 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {totalDelta > 0
                              ? `+${formatCurrency(totalDelta)}`
                              : formatCurrency(totalDelta)}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isBalanced
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {isBalanced ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Exact Match
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                Has Difference
                              </>
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                              isApproved
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                            }`}
                          >
                            {isApproved
                              ? "Approved & Locked"
                              : "Submitted (Pending)"}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                          <div>{closure.submittedBy?.name || "Cashier"}</div>
                          <div className="text-[10px]">
                            {closure.submittedAt
                              ? new Date(
                                  closure.submittedAt,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </div>
                        </td>

                        <td
                          className="px-5 py-3.5 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetails(closure)}
                              className="h-7 px-2 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Review
                            </Button>

                            {!isApproved && canApprove && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetails(closure)}
                                className="h-7 px-2 text-xs text-blue-600 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Sign-off
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Unified Pagination */}
        {pagination && (
          <div className="p-4 border-t border-border">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              onPageChange={(p) => setPage(p)}
              pageSize={pageSize}
              pageSizeOptions={[...FINANCE_CONFIG.defaults.pageSizeOptions]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="closures"
            />
          </div>
        )}
      </div>

      {/* Details & Sign-off Modal */}
      {selectedClosure && (
        <ClosureDetailsModal
          closure={selectedClosure}
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
          onUpdated={() => {
            handleCloseDetails();
          }}
        />
      )}
    </div>
  );
}
