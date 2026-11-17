"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Users, Search, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { incentivesApi } from "../api/incentives.api";
import { IncentiveLedgerEntry, IncentiveRecoveryObligation } from "../types/incentives.types";
import { useBranchContext } from "@/hooks/useBranchContext";

interface StaffEarningsTabProps {
  staffList: Array<{ _id: string; id?: string; name: string; staffCode?: string }>;
}

interface PagedResult<T> {
  data: T[];
  meta: { totalPages: number };
}

const EMPTY_LEDGER_ENTRIES: IncentiveLedgerEntry[] = [];
const EMPTY_RECOVERY_OBLIGATIONS: IncentiveRecoveryObligation[] = [];

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

const getReferenceId = (
  reference: IncentiveLedgerEntry["staffId"] | IncentiveRecoveryObligation["staffId"],
) => (typeof reference === "string" ? reference : reference._id);

export const StaffEarningsTab: React.FC<StaffEarningsTabProps> = ({ staffList = [] }) => {
  const [search, setSearch] = useState("");
  const { currentBranch, currentBranchId } = useBranchContext();
  const ledgerBranchId =
    currentBranchId && currentBranchId !== "all" ? currentBranchId : undefined;

  // Load each page because the table aggregates ledger values across all staff.
  const { data: ledgerData, isLoading, error, refetch } = useQuery({
    queryKey: ["incentives", "all-ledger-metrics", currentBranchId],
    queryFn: () =>
      loadAllPages((page) =>
        incentivesApi.listLedgerEntries({
          branchId: ledgerBranchId,
          page,
          limit: 500,
        }),
      ),
  });

  const {
    data: recoveryData,
    isLoading: isLoadingRecovery,
    error: recoveryError,
    refetch: refetchRecovery,
  } = useQuery({
    queryKey: ["incentives", "all-recovery-metrics", currentBranchId],
    queryFn: () =>
      loadAllPages((page) =>
        incentivesApi.listRecoveryObligations({ page, limit: 500 }),
      ),
  });

  const entries = ledgerData ?? EMPTY_LEDGER_ENTRIES;
  const obligations = recoveryData ?? EMPTY_RECOVERY_OBLIGATIONS;
  const isLoadingMetrics = isLoading || isLoadingRecovery;
  const metricsError = error || recoveryError;

  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format((paise || 0) / 100);
  };

  // Aggregate stats per staff member
  const staffSummaries = useMemo(() => {
    return staffList.map((staff) => {
      const sId = staff._id || staff.id;
      const staffEntries = entries.filter((e) => {
        return String(getReferenceId(e.staffId)) === String(sId);
      });

      const staffObligations = obligations.filter((o) => {
        return String(getReferenceId(o.staffId)) === String(sId);
      });

      const confirmedEarningsPaise = staffEntries
        .filter((e) => e.entryType === "ACCRUAL" && e.fulfillmentStatus === "confirmed")
        .reduce((sum, e) => sum + (e.amountInPaise || 0), 0);

      const pendingFulfillmentPaise = staffEntries
        .filter((e) => e.entryType === "ACCRUAL" && e.fulfillmentStatus === "pending")
        .reduce((sum, e) => sum + (e.amountInPaise || 0), 0);

      const outstandingClawbackPaise = staffObligations
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

      const netCommissionPositionPaise = confirmedEarningsPaise - outstandingClawbackPaise;

      return {
        ...staff,
        confirmedEarningsPaise,
        pendingFulfillmentPaise,
        outstandingClawbackPaise,
        netCommissionPositionPaise,
        totalTransactions: staffEntries.length,
      };
    });
  }, [staffList, entries, obligations]);

  // Filter staff by search; branch scope follows the application's branch selector.
  const filteredStaff = useMemo(() => {
    return staffSummaries.filter((staff) => {
      const matchesSearch =
        staff.name.toLowerCase().includes(search.toLowerCase()) ||
        (staff.staffCode && staff.staffCode.toLowerCase().includes(search.toLowerCase()));
      return matchesSearch;
    });
  }, [staffSummaries, search]);

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search team member by name or code..."
              className="pl-9 h-9 text-xs rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>
            {currentBranch?.name || "Selected organization scope"} · Commission position is accrued less
            outstanding clawbacks; it is not proof of payroll payment.
          </span>
        </div>
      </div>

      {/* Staff Grid / Table */}
      {isLoadingMetrics ? (
        <Card className="rounded-2xl border-neutral-200/80 p-12 text-center shadow-2xs">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">Calculating team performance & earnings...</p>
        </Card>
      ) : metricsError ? (
        <ErrorState
          title="Failed to load employee earnings"
          description="Could not aggregate incentive data for staff members."
          retryAction={{
            label: "Retry",
            onClick: () => {
              refetch();
              refetchRecovery();
            },
          }}
        />
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members found"
          description="No employee records matched your search."
        />
      ) : (
        <div className="border border-neutral-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Team Member</th>
                  <th className="py-3.5 px-4 text-right">Accrued & Confirmed</th>
                  <th className="py-3.5 px-4 text-right">Pending Service Completion</th>
                  <th className="py-3.5 px-4 text-right">Outstanding Clawback</th>
                  <th className="py-3.5 px-4 text-right">Net Commission Position</th>
                  <th className="py-3.5 px-4 text-center">Profile Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStaff.map((staff) => (
                  <tr key={staff._id || staff.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-neutral-900 text-sm">{staff.name}</div>
                      <div className="text-[11px] font-mono text-neutral-400">
                        {staff.staffCode || "No Code"} &bull; {staff.totalTransactions} transactions
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-neutral-900 whitespace-nowrap">
                      {formatRupees(staff.confirmedEarningsPaise)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {staff.pendingFulfillmentPaise > 0 ? (
                        <span className="font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          {formatRupees(staff.pendingFulfillmentPaise)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {staff.outstandingClawbackPaise > 0 ? (
                        <span className="font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                          {formatRupees(staff.outstandingClawbackPaise)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap text-sm ${
                      staff.netCommissionPositionPaise < 0 ? "text-red-700" : "text-emerald-700"
                    }`}>
                      {formatRupees(staff.netCommissionPositionPaise)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Link
                        href={`/employees/${staff._id || staff.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-medium transition-colors text-xs"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
