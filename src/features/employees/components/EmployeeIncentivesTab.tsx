"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { incentivesApi } from "@/features/incentives/api/incentives.api";
import { IncentiveLedgerEntry, IncentiveRecoveryObligation } from "@/features/incentives/types/incentives.types";
import { FulfillmentBadge } from "@/features/incentives/components/FulfillmentBadge";
import { useBranchContext } from "@/hooks/useBranchContext";

interface EmployeeIncentivesTabProps {
  employeeId: string;
  employeeName: string;
  staffCode: string;
}

interface PagedResult<T> {
  data: T[];
  meta: { totalPages: number };
}

const loadAllPages = async <T,>(
  loadPage: (page: number) => Promise<PagedResult<T>>,
): Promise<T[]> => {
  const firstPage = await loadPage(1);
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.totalPages - 1) },
      (_, index) => loadPage(index + 2),
    ),
  );
  return [...firstPage.data, ...remainingPages.flatMap((page) => page.data)];
};

export function EmployeeIncentivesTab({
  employeeId,
  employeeName,
  staffCode,
}: EmployeeIncentivesTabProps) {
  const [page, setPage] = useState(1);
  const [expandedExplanation, setExpandedExplanation] = useState<string | null>(null);
  const { currentBranchId } = useBranchContext();
  const branchId =
    currentBranchId && currentBranchId !== "all" ? currentBranchId : undefined;

  // 1. Fetch Employee's Earnings History (Immutable Ledger)
  const {
    data: ledgerData,
    isLoading: isLedgerLoading,
    error: ledgerError,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ["incentives", "employee-ledger", currentBranchId, employeeId, page],
    queryFn: () =>
      incentivesApi.listLedgerEntries({
        staffId: employeeId,
        branchId,
        page,
        limit: 10,
      }),
  });

  // 2. Load all ledger pages for accurate employee-wide summary cards.
  const {
    data: allLedgerEntries,
    isLoading: isLedgerSummaryLoading,
    error: ledgerSummaryError,
    refetch: refetchLedgerSummary,
  } = useQuery({
    queryKey: ["incentives", "employee-ledger-summary", currentBranchId, employeeId],
    queryFn: () =>
      loadAllPages((summaryPage) =>
        incentivesApi.listLedgerEntries({
          staffId: employeeId,
          branchId,
          page: summaryPage,
          limit: 500,
        }),
      ),
  });

  // 3. Load all recovery obligations so the balance is not limited to the first page.
  const {
    data: recoveryData,
    isLoading: isRecoveryLoading,
    error: recoveryError,
    refetch: refetchRecovery,
  } = useQuery({
    queryKey: ["incentives", "employee-recovery", currentBranchId, employeeId],
    queryFn: () =>
      loadAllPages((recoveryPage) =>
        incentivesApi.listRecoveryObligations({
          staffId: employeeId,
          page: recoveryPage,
          limit: 500,
        }),
      ),
  });

  // Format integer paise into INR
  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format((paise || 0) / 100);
  };

  const ledgerEntries: IncentiveLedgerEntry[] = ledgerData?.data || [];
  const meta = ledgerData?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const summaryLedgerEntries: IncentiveLedgerEntry[] = allLedgerEntries || [];
  const obligations: IncentiveRecoveryObligation[] = recoveryData || [];

  // Derived calculations for summary cards
  const totalEarnedPaise = summaryLedgerEntries
    .filter((e) => e.entryType === "ACCRUAL" && e.fulfillmentStatus === "confirmed")
    .reduce((sum, e) => sum + (e.amountInPaise || 0), 0);

  const pendingConfirmationPaise = summaryLedgerEntries
    .filter((e) => e.entryType === "ACCRUAL" && e.fulfillmentStatus === "pending")
    .reduce((sum, e) => sum + (e.amountInPaise || 0), 0);

  const outstandingRecoveryPaise = obligations
    .filter((o) => ["pending", "partially_recovered"].includes(o.status))
    .reduce(
      (sum, o) =>
        sum +
        Math.max(
          0,
          o.originalClawbackInPaise - o.totalRecoveredInPaise,
        ),
      0,
    );

  const netCommissionPaise = Math.max(0, totalEarnedPaise - outstandingRecoveryPaise);
  const summaryError = ledgerSummaryError || recoveryError;
  const retrySummary = () => {
    void refetchLedgerSummary();
    void refetchRecovery();
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanation(expandedExplanation === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Educational Header Banner */}
      <div className="bg-linear-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-200/70 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Incentives & Performance Earnings for {employeeName}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Staff Code: <span className="font-mono font-medium text-neutral-700">{staffCode}</span> &bull;
                Earnings are calculated on net service and product value upon payment settlement and verified service completion.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/80 border-blue-200 text-blue-700 font-semibold px-3 py-1">
            Authoritative Records
          </Badge>
        </div>
      </div>

      {summaryError && (
        <ErrorState
          title="Unable to load incentive totals"
          description="Employee-wide earnings and recovery totals could not be calculated."
          retryAction={{ label: "Retry", onClick: retrySummary }}
        />
      )}

      {/* User-Friendly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Take-Home Incentives */}
        <Card className="rounded-2xl border-neutral-200/80 shadow-2xs bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Net Commission
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-emerald-700">
              {isLedgerSummaryLoading || isRecoveryLoading || summaryError
                ? "—"
                : formatRupees(netCommissionPaise)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Approved earnings minus adjustments
            </p>
          </CardContent>
        </Card>

        {/* Confirmed / Earned Amount */}
        <Card className="rounded-2xl border-neutral-200/80 shadow-2xs bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Completed Earnings
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-neutral-900">
              {isLedgerSummaryLoading || ledgerSummaryError
                ? "—"
                : formatRupees(totalEarnedPaise)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Service completed & payment settled
            </p>
          </CardContent>
        </Card>

        {/* Pending Service Completion */}
        <Card className="rounded-2xl border-neutral-200/80 shadow-2xs bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Pending Confirmation
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">
              {isLedgerSummaryLoading || ledgerSummaryError
                ? "—"
                : formatRupees(pendingConfirmationPaise)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Paid invoice awaiting service sign-off
            </p>
          </CardContent>
        </Card>

        {/* Amount to Recover from Returns */}
        <Card className="rounded-2xl border-neutral-200/80 shadow-2xs bg-white">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Amount to Recover
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-red-600">
              {isRecoveryLoading || recoveryError
                ? "—"
                : formatRupees(outstandingRecoveryPaise)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Refund or return commission adjustments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction-Level Earnings History Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl overflow-hidden shadow-2xs space-y-0">
        <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Earnings History</h4>
            <p className="text-xs text-neutral-500">
              Transaction-by-transaction log of all commissions, service completions, and adjustments.
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {meta.total} total records
          </span>
        </div>

        {isLedgerLoading ? (
          <div className="p-12 text-center text-xs text-neutral-400">
            <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading earnings history...
          </div>
        ) : ledgerError ? (
          <div className="p-8">
            <ErrorState
              title="Unable to load earnings history"
              description="Failed to fetch transaction entries for this employee."
              retryAction={{
                label: "Retry",
                onClick: () => refetchLedger(),
              }}
            />
          </div>
        ) : ledgerEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Award}
              title="No earnings recorded yet"
              description="Completed services and settled invoices will appear here automatically."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Activity Type</th>
                  <th className="py-3 px-4">Plan Applied</th>
                  <th className="py-3 px-4">Service Status</th>
                  <th className="py-3 px-4 text-right">Commission Amount</th>
                  <th className="py-3 px-4 text-center">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ledgerEntries.map((entry) => {
                  const isClawback = entry.entryType === "CLAWBACK";
                  const entryId = entry.id || entry._id || "";
                  const isExpanded = expandedExplanation === entryId;
                  const schemeObj =
                    typeof entry.schemeId === "object" ? entry.schemeId : null;

                  return (
                    <React.Fragment key={entryId}>
                      <tr className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isClawback ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">
                              Adjustment / Return
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                              Earned Commission
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                          {schemeObj?.name || "Standard Commission"}
                          {schemeObj?.code && (
                            <div className="text-[10px] font-mono text-neutral-400">{schemeObj.code}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <FulfillmentBadge status={entry.fulfillmentStatus} />
                        </td>
                        <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                          isClawback ? "text-red-600" : "text-emerald-700"
                        }`}>
                          {isClawback ? "-" : "+"}{formatRupees(entry.amountInPaise)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExplanation(entryId)}
                            className="h-7 text-xs gap-1 text-neutral-500 hover:text-neutral-900"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Why?</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>
                        </td>
                      </tr>

                      {/* Expandable "How was this calculated?" Drawer */}
                      {isExpanded && (
                        <tr className="bg-blue-50/30 border-b border-blue-100/60">
                          <td colSpan={6} className="p-4">
                            <div className="bg-white rounded-xl border border-blue-200/80 p-4 space-y-2 text-xs">
                              <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                                Calculation Details & Evidence
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-neutral-600">
                                <div>
                                  <span className="font-medium text-neutral-800">Net Sale Value: </span>
                                  {formatRupees(entry.attributedRevenueInPaise || entry.sourceRevenueInPaise || 0)}
                                </div>
                                <div>
                                  <span className="font-medium text-neutral-800">Commission Rate: </span>
                                  {entry.calculationSnapshot?.appliedRate ? `${entry.calculationSnapshot.appliedRate}%` : "Fixed Tier"}
                                </div>
                                <div>
                                  <span className="font-medium text-neutral-800">Invoice ID: </span>
                                  <span className="font-mono text-neutral-500">{entry.invoiceId?.slice(-8) || "N/A"}</span>
                                </div>
                              </div>
                              <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                                {entry.fulfillmentStatus === "confirmed" ? (
                                  <span className="text-emerald-700 font-medium">
                                    &bull; Fully unlocked for payroll because both invoice payment and physical service execution were confirmed.
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-medium">
                                    &bull; Pending payroll unlock: The customer has paid, but verified service completion is awaiting sign-off.
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="p-3 border-t bg-neutral-50/50">
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              itemLabel="earnings records"
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
