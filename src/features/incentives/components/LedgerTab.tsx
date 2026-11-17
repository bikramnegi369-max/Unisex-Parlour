"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { incentivesApi } from "../api/incentives.api";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FulfillmentBadge } from "./FulfillmentBadge";
import {
  IncentiveLedgerEntry,
  IncentiveLedgerEntryType,
  formatCalculationBasisLabel,
} from "../types/incentives.types";
import { BookOpen, ShieldCheck, ArrowDownRight, ArrowUpRight, Filter } from "lucide-react";

interface LedgerTabProps {
  staffList?: Array<{ id: string; name: string }>;
  branches?: Array<{ id: string; name: string }>;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({ staffList = [], branches = [] }) => {
  const [page, setPage] = useState(1);
  const [staffId, setStaffId] = useState<string>("all");
  const [branchId, setBranchId] = useState<string>("all");
  const [entryType, setEntryType] = useState<IncentiveLedgerEntryType | "all">("all");
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string>("all");

  const {
    data: ledgerData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["incentives", "ledger", { page, staffId, branchId, entryType, fulfillmentStatus }],
    queryFn: () =>
      incentivesApi.listLedgerEntries({
        page,
        limit: 15,
        staffId: staffId !== "all" ? staffId : undefined,
        branchId: branchId !== "all" ? branchId : undefined,
        entryType: entryType === "all" ? undefined : entryType,
        fulfillmentStatus: fulfillmentStatus !== "all" ? fulfillmentStatus : undefined,
      }),
  });

  const entries = ledgerData?.data || [];
  const meta = ledgerData?.meta || { page: 1, limit: 15, total: 0, totalPages: 1 };

  return (
    <div className="space-y-4">
      {/* Educational Banner */}
      <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5 text-xs text-zinc-700 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Immutable incentive ledger:</strong> Accruals and clawbacks are append-only and
          retain the calculation basis and amount in integer paise. Eligibility gates depend on the
          category: service commissions require settlement and confirmed service completion, while
          sale commissions require payment and the relevant product, subscription, or membership
          issuance evidence.
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-card p-3 rounded-xl border">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter by:
        </div>

        <div className="w-40">
          <Select
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value);
              setPage(1);
            }}
            className="h-8.5 text-xs"
          >
            <option value="all">All Stylists / Staff</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-37.5">
          <Select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setPage(1);
            }}
            className="h-8.5 text-xs"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-32.5">
          <Select
            value={entryType}
            onChange={(e) => {
              setEntryType(e.target.value as IncentiveLedgerEntryType | "all");
              setPage(1);
            }}
            className="h-8.5 text-xs"
          >
            <option value="all">All Entry Types</option>
            <option value="ACCRUAL">Accrual</option>
            <option value="CLAWBACK">Clawback</option>
          </Select>
        </div>

        <div className="w-35">
          <Select
            value={fulfillmentStatus}
            onChange={(e) => {
              setFulfillmentStatus(e.target.value);
              setPage(1);
            }}
            className="h-8.5 text-xs"
          >
            <option value="all">All Gate Statuses</option>
            <option value="confirmed">Fulfilled</option>
            <option value="pending">Pending Gate</option>
            <option value="corrected">Corrected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Ledger Table */}
      {error ? (
        <ErrorState
          title="Failed to load incentive ledger"
          description={
            error instanceof Error
              ? error.message
              : "An error occurred fetching ledger entries."
          }
          retryAction={{ label: "Retry Ledger", onClick: () => refetch() }}
        />
      ) : (
        <div className="border rounded-xl bg-card overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 border-b text-zinc-600 font-medium">
                <tr>
                  <th className="py-3 px-4">Timestamp & Event</th>
                  <th className="py-3 px-4">Stylist & Branch</th>
                  <th className="py-3 px-4">Scheme & Basis</th>
                  <th className="py-3 px-4">Attributed Revenue</th>
                  <th className="py-3 px-4 text-right">Commission Amount</th>
                  <th className="py-3 px-4 text-center">Fulfillment Gate</th>
                </tr>
              </thead>
              <tbody className="divide-y text-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading append-only incentive ledger...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <EmptyState
                        icon={BookOpen}
                        title="No ledger entries found"
                        description="Commission accruals and returns will appear here once invoices are settled and services are physically verified."
                      />
                    </td>
                  </tr>
                ) : (
                  entries.map((entry: IncentiveLedgerEntry) => {
                    const staffName =
                      typeof entry.staffId === "object" ? entry.staffId.name : "Assigned Staff";
                    const staffCode =
                      typeof entry.staffId === "object" ? entry.staffId.staffCode : null;
                    const branchName =
                      typeof entry.branchId === "object" ? entry.branchId.name : "Branch";
                    const schemeName =
                      typeof entry.schemeId === "object" ? entry.schemeId.name : "Scheme";
                    const schemeCode =
                      typeof entry.schemeId === "object" ? entry.schemeId.code : null;

                    const isClawback = entry.entryType === "CLAWBACK";

                    return (
                      <tr key={entry.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900">
                            {new Date(entry.createdAt).toLocaleDateString()}{" "}
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {new Date(entry.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate max-w-35">
                            {entry.idempotencyKey}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900">{staffName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {branchName} {staffCode ? `• ${staffCode}` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900">{schemeName}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {entry.calculationSnapshot?.appliedRate
                              ? `${entry.calculationSnapshot.appliedRate}% • `
                              : ""}
                            {entry.calculationSnapshot?.calculationBasis
                              ? formatCalculationBasisLabel(
                                  entry.calculationSnapshot.calculationBasis,
                                )
                              : schemeCode || "Default"}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-medium">
                          ₹{(entry.attributedRevenueInPaise / 100).toFixed(2)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div
                            className={`font-mono font-bold flex items-center justify-end gap-1 ${
                              isClawback ? "text-destructive" : "text-emerald-600"
                            }`}
                          >
                            {isClawback ? (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                            {isClawback ? "-" : "+"}₹{(entry.amountInPaise / 100).toFixed(2)}
                          </div>
                          <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                            {entry.entryType}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center">
                            <FulfillmentBadge status={entry.fulfillmentStatus} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="p-3 border-t bg-zinc-50/50">
              <Pagination
                currentPage={page}
                totalPages={meta.totalPages}
                totalItems={meta.total}
                itemLabel="ledger entries"
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
