"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { incentivesApi } from "../api/incentives.api";
import type { AttendanceIncentiveEvaluation } from "../types/incentives.types";

interface AttendanceBonusPanelProps {
  branchId: string | null;
  staffList: Array<{ id: string; name: string; staffCode?: string }>;
  canApprove: boolean;
}

export const AttendanceBonusPanel: React.FC<AttendanceBonusPanelProps> = ({
  branchId,
  staffList,
  canApprove,
}) => {
  const queryClient = useQueryClient();
  const hasBranch = Boolean(branchId && branchId !== "all");
  const [staffId, setStaffId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [evaluation, setEvaluation] = useState<AttendanceIncentiveEvaluation | null>(null);

  const {
    data: schemes = [],
    isError: isSchemesError,
    error: schemesError,
    isFetching: isSchemesFetching,
    refetch: refetchSchemes,
  } = useQuery({
    queryKey: ["incentives", "attendance-schemes", branchId],
    queryFn: async () => {
      const response = await incentivesApi.listSchemes({
        limit: 100,
        status: "active",
        schemeType: "ATTENDANCE_BONUS",
      });
      return response.data;
    },
    enabled: canApprove && hasBranch,
  });

  const computeMutation = useMutation({
    mutationFn: () => incentivesApi.computeAttendanceEvaluation({ staffId, schemeId, monthYear }),
    onSuccess: (result) => {
      setEvaluation(result);
      toast.success("Verified attendance evaluation computed");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Attendance evaluation failed");
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => incentivesApi.finalizeAttendanceEvaluation(evaluation?._id || ""),
    onSuccess: (result) => {
      setEvaluation(result.evaluation);
      queryClient.invalidateQueries({ queryKey: ["incentives", "ledger"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "all-ledger-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["incentives", "summary"] });
      toast.success(
        result.ledgerEntry
          ? "Attendance incentive accrued to the immutable ledger"
          : "Attendance evaluation finalized with no bonus earned",
      );
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Attendance evaluation could not be finalized");
    },
  });

  const canCompute = Boolean(hasBranch && staffId && schemeId && monthYear);
  const blocked = Boolean(evaluation?.blockReasons.length);

  if (!canApprove) return null;

  return (
    <Card className="shadow-none border border-neutral-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarCheck className="h-4 w-4 text-primary" />
          Biometric Attendance Incentives
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasBranch ? (
          <p className="text-xs text-muted-foreground">
            Select one branch to evaluate attendance. Organization-wide evaluation is not supported.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Only complete mapped biometric punches or reasoned manager corrections qualify.
              Incomplete or disputed attendance must be reconciled before finalization.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Select
                value={staffId}
                onChange={(event) => {
                  setStaffId(event.target.value);
                  setEvaluation(null);
                }}
              >
                <option value="">Select staff</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}{staff.staffCode ? ` (${staff.staffCode})` : ""}
                  </option>
                ))}
              </Select>
              <Select
                value={schemeId}
                onChange={(event) => {
                  setSchemeId(event.target.value);
                  setEvaluation(null);
                }}
              >
                <option value="">Select active attendance scheme</option>
                {schemes.map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                ))}
              </Select>
              <Input
                type="month"
                value={monthYear}
                onChange={(event) => {
                  setMonthYear(event.target.value);
                  setEvaluation(null);
                }}
                aria-label="Attendance month"
              />
            </div>
            {isSchemesError && (
              <div role="alert" className="flex flex-wrap items-center gap-3 text-xs text-destructive">
                <span>
                  {schemesError instanceof Error
                    ? schemesError.message
                    : "Could not load active attendance schemes."}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSchemesFetching}
                  onClick={() => refetchSchemes()}
                >
                  {isSchemesFetching ? "Retrying..." : "Retry schemes"}
                </Button>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={!canCompute || computeMutation.isPending}
              onClick={() => computeMutation.mutate()}
            >
              {computeMutation.isPending ? "Computing..." : "Compute eligibility"}
            </Button>
          </>
        )}

        {evaluation && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {blocked ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <BadgeCheck className="h-4 w-4 text-emerald-600" />
              )}
              {evaluation.achievedDays} / {evaluation.targetDays} verified days
            </div>
            <p className="text-xs text-muted-foreground">
              {evaluation.isTargetMet
                ? `Bonus: ₹${(evaluation.bonusAwardedInPaise / 100).toFixed(2)}`
                : "Attendance threshold not met; no earning will be created."}
            </p>
            {blocked && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800">
                {evaluation.blockReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
            {evaluation.status !== "finalized" && (
              <Button
                type="button"
                disabled={blocked || finalizeMutation.isPending}
                onClick={() => finalizeMutation.mutate()}
              >
                {finalizeMutation.isPending ? "Finalizing..." : "Approve and finalize"}
              </Button>
            )}
            {evaluation.status === "finalized" && (
              <p className="text-xs font-medium text-emerald-700">
                Finalized to the immutable ledger. The next payroll calculation includes this award;
                actual payment confirmation is a separate step.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
