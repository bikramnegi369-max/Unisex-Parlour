"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { AlertCircle, RotateCcw, ShieldAlert, CheckCircle2, CreditCard } from "lucide-react";
import { incentivesApi } from "../api/incentives.api";
import { IncentiveRecoveryObligation } from "../types/incentives.types";
import type { IncentiveRecoveryPaymentAttempt } from "../types/incentives.types";
import { ManualRecoveryPaymentDialog } from "./ManualRecoveryPaymentDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/errors";

interface RecoveryObligationsTabProps {
  staffList?: Array<{ _id: string; name: string }>;
}

export const RecoveryObligationsTab: React.FC<RecoveryObligationsTabProps> = ({ staffList = [] }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentBranchId } = useBranchContext();
  const canSettle = hasPermission(user, "payroll.disburse");
  const canReverse = hasPermission(user, "payroll.reverse");
  const hasActiveBranch = Boolean(currentBranchId && currentBranchId !== "all");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedObligation, setSelectedObligation] = useState<IncentiveRecoveryObligation | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<IncentiveRecoveryPaymentAttempt | null>(null);
  const limit = 15;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["incentives", "recovery-obligations", { currentBranchId, page, limit, staffId: selectedStaff, status: selectedStatus }],
    queryFn: () =>
      incentivesApi.listRecoveryObligations({
        page,
        limit,
        staffId: selectedStaff || undefined,
        status: selectedStatus || undefined,
      }),
  });

  const invalidateRecoveryData = () => {
    queryClient.invalidateQueries({ queryKey: ["incentives", "recovery-obligations"] });
    queryClient.invalidateQueries({ queryKey: ["incentives", "summary"] });
    queryClient.invalidateQueries({ queryKey: ["incentives", "all-recovery-metrics"] });
  };

  const applyRecoveryResult = (
    result: {
      obligation: IncentiveRecoveryObligation;
      payment: IncentiveRecoveryPaymentAttempt;
      isIdempotentReplay: boolean;
    },
    collectibleDeltaInPaise = 0,
  ) => {
    setSelectedObligation((current) => {
      if (!current || current._id !== result.obligation._id) return current;
      const updated = { ...current, ...result.obligation };
      return {
        ...updated,
        remainingAvailableInPaise: Math.max(
          0,
          updated.originalClawbackInPaise -
            updated.totalRecoveredInPaise -
            updated.totalReservedInPaise,
        ),
        collectibleAvailableInPaise: Math.max(
          0,
          (current.collectibleAvailableInPaise || 0) +
            (result.isIdempotentReplay ? 0 : collectibleDeltaInPaise),
        ),
      };
    });
  };

  const recordMutation = useMutation({
    mutationFn: ({ obligationId, payload }: {
      obligationId: string;
      payload: Parameters<typeof incentivesApi.recordRecoveryPayment>[1];
    }) => incentivesApi.recordRecoveryPayment(obligationId, payload),
    onSuccess: (result) => {
      setActiveAttempt(result.payment);
      applyRecoveryResult(result, -result.payment.amountInPaise);
      toast.success("Recovery attempt recorded. It remains outstanding until actual receipt is confirmed.");
      invalidateRecoveryData();
    },
    onError: (mutationError: unknown) => toast.error(getErrorMessage(mutationError, "Could not record recovery attempt.")),
  });

  const confirmMutation = useMutation({
    mutationFn: ({ obligationId, paymentId }: { obligationId: string; paymentId: string }) =>
      incentivesApi.confirmRecoveryPayment(obligationId, paymentId),
    onSuccess: (result) => {
      setActiveAttempt(result.payment);
      applyRecoveryResult(result);
      toast.success("Actual recovery confirmed; outstanding balance updated.");
      invalidateRecoveryData();
    },
    onError: (mutationError: unknown) => toast.error(getErrorMessage(mutationError, "Could not confirm recovery.")),
  });

  const failMutation = useMutation({
    mutationFn: ({ obligationId, paymentId, reason }: { obligationId: string; paymentId: string; reason: string }) =>
      incentivesApi.failRecoveryPayment(obligationId, paymentId, reason),
    onSuccess: (result) => {
      setActiveAttempt(result.payment);
      applyRecoveryResult(result, result.payment.amountInPaise);
      toast.success("Failed attempt recorded; reserved amount is available for retry.");
      invalidateRecoveryData();
    },
    onError: (mutationError: unknown) => toast.error(getErrorMessage(mutationError, "Could not record failed recovery.")),
  });

  const reverseMutation = useMutation({
    mutationFn: ({ obligationId, paymentId, reason }: { obligationId: string; paymentId: string; reason: string }) =>
      incentivesApi.reverseRecoveryPayment(obligationId, paymentId, reason),
    onSuccess: (result) => {
      setActiveAttempt(result.payment);
      applyRecoveryResult(result, result.payment.amountInPaise);
      toast.success("Recovery reversal recorded; outstanding balance restored.");
      invalidateRecoveryData();
    },
    onError: (mutationError: unknown) => toast.error(getErrorMessage(mutationError, "Could not reverse recovery.")),
  });

  const isActionPending =
    recordMutation.isPending || confirmMutation.isPending || failMutation.isPending || reverseMutation.isPending;

  const getStatusBadge = (status: IncentiveRecoveryObligation["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3" /> Open
          </Badge>
        );
      case "partially_recovered":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-medium">
            <RotateCcw className="w-3 h-3" /> Partial
          </Badge>
        );
      case "recovered":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Recovered
          </Badge>
        );
      case "written_off":
        return (
          <Badge variant="outline" className="bg-neutral-100 text-neutral-600 border-neutral-200 flex items-center gap-1 font-medium">
            Written off
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatRupees = (paise: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format((paise || 0) / 100);
  };

  const getStaffName = (staff: IncentiveRecoveryObligation["staffId"]) => {
    if (typeof staff === "object" && staff !== null) {
      return staff.name || "Unknown Staff";
    }
    return String(staff || "Unknown Staff");
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-neutral-200">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Staff Filter */}
          <div className="w-full sm:w-52">
            <select
              value={selectedStaff}
              onChange={(e) => {
                setSelectedStaff(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">All Staff Members</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            >
              <option value="">All Statuses</option>
              <option value="pending">Open</option>
              <option value="partially_recovered">Partially Recovered</option>
              <option value="recovered">Recovered</option>
              <option value="written_off">Written off</option>
            </select>
          </div>

          {(selectedStaff || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedStaff("");
                setSelectedStatus("");
                setPage(1);
              }}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              Reset Filters
            </Button>
          )}
        </div>

        <div className="text-xs text-neutral-500 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Recovery requires a confirmed paid commission and authorized manual receipt confirmation.</span>
        </div>
        {canSettle && !hasActiveBranch && (
          <p role="status" className="text-xs text-amber-700">
            Select a specific branch to record or confirm a recovery payment.
          </p>
        )}
      </div>

      {/* Main Table / Content */}
      {isLoading ? (
        <Card className="rounded-xl border-neutral-200">
          <CardContent className="p-12 flex justify-center items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-neutral-500 font-medium">Loading recovery obligations...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <ErrorState
          title="Failed to load recovery obligations"
          description="Could not retrieve the clawback obligations from the incentive engine."
          retryAction={{
            label: "Retry",
            onClick: () => refetch(),
          }}
        />
      ) : !data?.data || data.data.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No recovery obligations found"
          description={
            selectedStaff || selectedStatus
              ? "No recovery records matched the selected filters."
              : "No clawbacks or returns have triggered recovery obligations for this salon."
          }
        />
      ) : (
        <Card className="rounded-xl border-neutral-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-xs uppercase font-semibold text-neutral-600 tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Clawback Total</th>
                  <th className="py-3.5 px-4 text-right">Recovered</th>
                  <th className="py-3.5 px-4 text-right">Reserved</th>
                  <th className="py-3.5 px-4 text-right">Collectible / Outstanding</th>
                  <th className="py-3.5 px-4">Invoice / Event Ref</th>
                  <th className="py-3.5 px-4">Latest Attempt</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {data.data.map((obligation: IncentiveRecoveryObligation) => (
                  <tr key={obligation.id || obligation._id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                      {new Date(obligation.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                      {getStaffName(obligation.staffId)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(obligation.status)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600 whitespace-nowrap">
                      {formatRupees(obligation.originalClawbackInPaise)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 whitespace-nowrap">
                      {formatRupees(obligation.totalRecoveredInPaise)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-700 whitespace-nowrap">
                      {formatRupees(obligation.totalReservedInPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-neutral-900 whitespace-nowrap">
                      <div>{formatRupees(obligation.collectibleAvailableInPaise || 0)} collectible</div>
                      <div className="text-[10px] font-normal text-neutral-500">
                        {formatRupees(obligation.remainingAvailableInPaise)} outstanding
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-neutral-500 whitespace-nowrap">
                      {typeof obligation.clawbackLedgerId === "object" &&
                      obligation.clawbackLedgerId !== null ? (
                        obligation.clawbackLedgerId.invoiceId ? (
                          <span title={`Invoice: ${obligation.clawbackLedgerId.invoiceId}`}>
                            Inv: {obligation.clawbackLedgerId.invoiceId.slice(-8)}
                          </span>
                        ) : (
                          <span title={`Event: ${obligation.clawbackLedgerId.settlementEventId}`}>
                            Evt: {obligation.clawbackLedgerId.settlementEventId.slice(-8)}
                          </span>
                        )
                      ) : (
                        <span title={`Ledger: ${obligation.clawbackLedgerId}`}>
                          Ledger: {obligation.clawbackLedgerId.slice(-8)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {obligation.paymentHistory?.[0] ? (
                        <div>
                          <Badge
                            variant="outline"
                            className={
                              obligation.paymentHistory[0].status === "confirmed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : obligation.paymentHistory[0].status === "recorded"
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : obligation.paymentHistory[0].status === "failed"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-600"
                            }
                          >
                            {obligation.paymentHistory[0].status}
                          </Badge>
                          <div className="mt-1 text-[10px] text-neutral-500">
                            {formatRupees(obligation.paymentHistory[0].amountInPaise)} · {obligation.paymentHistory[0].paymentReference}
                          </div>
                        </div>
                      ) : (
                        <span className="text-neutral-400">No attempts</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canSettle ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!hasActiveBranch || isActionPending || (
                            (obligation.collectibleAvailableInPaise || 0) <= 0
                            && obligation.paymentHistory?.[0]?.status !== "recorded"
                          )}
                          title={
                            !hasActiveBranch
                              ? "Select a specific branch before recording or confirming a recovery payment."
                              : (obligation.collectibleAvailableInPaise || 0) <= 0
                              ? "Requires a paid, unreversed payroll commission balance"
                              : "Record or confirm a manual recovery payment"
                          }
                          onClick={() => {
                            setSelectedObligation(obligation);
                            const latestAttempt = obligation.paymentHistory?.[0] || null;
                            setActiveAttempt(
                              latestAttempt?.status === "recorded" || latestAttempt?.status === "failed"
                                ? latestAttempt
                                : null,
                            );
                          }}
                        >
                          <CreditCard className="mr-1 h-3.5 w-3.5" />
                          {obligation.paymentHistory?.[0]?.status === "recorded"
                            ? "Confirm"
                            : (obligation.collectibleAvailableInPaise || 0) > 0
                              ? "Recover"
                              : "Not payable"}
                        </Button>
                      ) : (
                        <span className="text-[10px] text-neutral-500">
                          Requires payroll.disburse
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="p-3 border-t bg-zinc-50/50">
              <Pagination
                currentPage={page}
                totalPages={data.meta.totalPages}
                totalItems={data.meta.total}
                itemLabel="obligations"
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      )}
      <ManualRecoveryPaymentDialog
        key={selectedObligation?._id || "closed"}
        isOpen={Boolean(selectedObligation)}
        obligation={selectedObligation}
        attempt={activeAttempt}
        history={selectedObligation?.paymentHistory || []}
        canReverse={canReverse}
        isRecording={recordMutation.isPending}
        isConfirming={confirmMutation.isPending}
        isFailing={failMutation.isPending}
        isReversing={reverseMutation.isPending}
        onClose={() => {
          setSelectedObligation(null);
          setActiveAttempt(null);
        }}
        onAttemptChange={setActiveAttempt}
        onRecord={(payload) => {
          if (!selectedObligation) throw new Error("Select a recovery obligation first.");
          return recordMutation.mutateAsync({
            obligationId: selectedObligation._id,
            payload,
          }).then((result) => result.payment);
        }}
        onConfirm={(paymentId) => {
          if (!selectedObligation) throw new Error("Select a recovery obligation first.");
          return confirmMutation.mutateAsync({
            obligationId: selectedObligation._id,
            paymentId,
          }).then((result) => result.payment);
        }}
        onFail={(paymentId, reason) => {
          if (!selectedObligation) throw new Error("Select a recovery obligation first.");
          return failMutation.mutateAsync({
            obligationId: selectedObligation._id,
            paymentId,
            reason,
          }).then((result) => result.payment);
        }}
        onReverse={(paymentId, reason) => {
          if (!selectedObligation) throw new Error("Select a recovery obligation first.");
          return reverseMutation.mutateAsync({
            obligationId: selectedObligation._id,
            paymentId,
            reason,
          }).then((result) => result.payment);
        }}
      />
    </div>
  );
};
