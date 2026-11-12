"use client";

import React, { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { SUBSCRIPTIONS_CONFIG } from "../config/subscriptions.config";
import { useCancellationPreview } from "../hooks/useCancellationPreview";
import { useCancellationOperation } from "../hooks/useCancellationOperation";
import { useRetryCancellationOperation } from "../hooks/useRetryCancellationOperation";
import {
  cancelSubscriptionSchema,
  type CancelSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type {
  Subscription,
  CancelSubscriptionPayload,
  AffectedAppointmentPreview,
  ServiceLineToRebill,
} from "../types/subscription.types";

interface CancelSubscriptionDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: CancelSubscriptionPayload) => Promise<{
    operationId?: string;
    isAsync?: boolean;
    status?: string;
  } | void>;
  isLoading: boolean;
}

function generateIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `cancel_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function CancelSubscriptionDialog({
  subscription,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancelSubscriptionDialogProps) {
  const { user } = useAuth();
  const canConfigure = hasPermission(
    user,
    SUBSCRIPTIONS_CONFIG.permissions.configure,
  );

  // Stable idempotency key for this cancellation attempt session
  const [idempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // Local state for active async operation if returned by backend (HTTP 202)
  const [activeOperationId, setActiveOperationId] = useState<string | null>(
    null,
  );
  const [showAffectedAppointments, setShowAffectedAppointments] =
    useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Fetch Authoritative Cancellation Preview
  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
    error: previewError,
    refetch: refetchPreview,
  } = useCancellationPreview(subscription.id, isOpen && !activeOperationId);

  // Poll Operation Status if Async Operation is Active
  const { data: operationData } = useCancellationOperation(
    subscription.id,
    activeOperationId,
    {
      enabled: Boolean(activeOperationId),
    },
  );

  const retryMutation = useRetryCancellationOperation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelSubscriptionFormValues>({
    resolver: zodResolver(
      cancelSubscriptionSchema,
    ) as unknown as Resolver<CancelSubscriptionFormValues>,
    defaultValues: {
      reason: "",
    },
  });

  const handleFormSubmit = async (values: CancelSubscriptionFormValues) => {
    setSubmissionError(null);
    try {
      const result = await onConfirm({
        reason: values.reason,
        idempotencyKey,
        forceAsync: false,
      });

      if (result && result.isAsync && result.operationId) {
        // Backend accepted background processing (HTTP 202)
        setActiveOperationId(result.operationId);
      }
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to initiate cancellation.";
      setSubmissionError(msg);
      // Re-fetch preview to check if backend state or eligibility changed
      refetchPreview();
    }
  };

  const handleRetry = async () => {
    if (!activeOperationId) return;
    try {
      await retryMutation.mutateAsync({
        subscriptionId: subscription.id,
        operationId: activeOperationId,
      });
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to retry operation.";
      setSubmissionError(msg);
    }
  };

  if (!isOpen) return null;

  // VIEW 1: Asynchronous Cancellation Operation Progress View
  if (activeOperationId) {
    const isTerminalCompleted = operationData?.status === "completed";
    const isTerminalFailed = operationData?.status === "failed";
    const isRequiresReconciliation =
      operationData?.status === "requires_reconciliation";
    const isProcessing =
      !operationData ||
      operationData.status === "pending" ||
      operationData.status === "processing";

    const progress = operationData?.progress;
    const processedApts =
      operationData?.processedAppointmentCount ??
      progress?.processedAppointmentCount ??
      progress?.processedAppointments ??
      0;
    const totalApts =
      operationData?.totalAppointmentCount ??
      progress?.totalAppointmentCount ??
      progress?.totalAppointments ??
      0;
    const percent =
      totalApts > 0
        ? Math.min(100, Math.round((processedApts / totalApts) * 100))
        : 0;

    return (
      <div className="space-y-4 py-1 text-foreground">
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isProcessing && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {isTerminalCompleted && (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              )}
              {isTerminalFailed && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              {isRequiresReconciliation && (
                <ShieldAlert className="h-5 w-5 text-amber-500" />
              )}
              <h3 className="text-sm font-bold">
                {isProcessing && "Processing Subscription Cancellation..."}
                {isTerminalCompleted && "Subscription Cancelled Successfully"}
                {isTerminalFailed && "Cancellation Operation Failed"}
                {isRequiresReconciliation && "Reconciliation Required"}
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {`Op #${activeOperationId.slice(-6)}`}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {isProcessing &&
              "Restoring original service charges, updating appointment invoices, and closing the subscription in the background."}
            {isTerminalCompleted &&
              "Original customer-agreed service prices have been restored to their respective appointment invoices and subscription status updated."}
            {isTerminalFailed &&
              (operationData?.errorMessage ||
                operationData?.failureReason ||
                "An unexpected error occurred while executing the cancellation operation.")}
            {isRequiresReconciliation &&
              (operationData?.errorMessage ||
                "Financial discrepancy detected during service price restoration. Managerial audit required.")}
          </p>

          {/* Progress Counters */}
          {totalApts > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold text-foreground">
                  {processedApts} of {totalApts} appointments ({percent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isTerminalCompleted
                      ? "bg-emerald-500"
                      : isTerminalFailed
                        ? "bg-destructive"
                        : "bg-primary"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {submissionError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {submissionError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {isTerminalFailed && !isRequiresReconciliation && canConfigure && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retryMutation.isPending}
              className="h-9 text-xs cursor-pointer gap-1.5"
            >
              {retryMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Retry Operation
            </Button>
          )}

          <Button
            type="button"
            variant={isTerminalCompleted ? "default" : "outline"}
            size="sm"
            onClick={onClose}
            className="h-9 text-xs cursor-pointer"
          >
            {isTerminalCompleted ? "Done" : "Close & Keep Processing"}
          </Button>
        </div>
      </div>
    );
  }

  // VIEW 2: Cancellation Impact Preview & Confirmation Form
  const isRuleB = preview?.eligibilityRule === "RULE_B";
  // Fails closed if preview has not returned or indicates ineligibility
  const isEligible = preview ? preview.isEligible === true : false;
  const ineligibilityReason = preview?.ineligibilityReason;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* SECTION 1: Authoritative Cancellation Preview Banner */}
      {isPreviewLoading ? (
        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Analyzing cancellation impact & appointment usage...</span>
        </div>
      ) : isPreviewError ? (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Failed to load cancellation preview</p>
              <p className="text-muted-foreground">
                {(previewError as Error)?.message ||
                  "Could not retrieve authoritative impact data."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetchPreview()}
            className="h-7 text-xs gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        </div>
      ) : preview ? (
        <div className="space-y-3">
          {/* Eligibility Check Banner */}
          {!isEligible ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  Subscription Ineligible for Cancellation
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {ineligibilityReason ||
                    "This subscription cannot be cancelled in its current state per business policy."}
                </p>
                {preview.blockingInconsistencies &&
                  preview.blockingInconsistencies.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5 pt-1">
                      {preview.blockingInconsistencies.map((inc: string, i: number) => (
                        <li key={i}>{inc}</li>
                      ))}
                    </ul>
                  )}
              </div>
            </div>
          ) : isRuleB ? (
            /* Rule B Notice: Cancel subscription and restore used-service charges */
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-foreground text-xs space-y-2">
              <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-bold">
                  Rule B: Cancel Subscription and Restore Used-Service Charges
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                This subscription has consumed{" "}
                <span className="font-semibold text-foreground">
                  {preview.consumedEntitlementCount} entitlement(s)
                </span>{" "}
                across{" "}
                <span className="font-semibold text-foreground">
                  {preview.affectedAppointmentCount} appointment(s)
                </span>
                . Cancelling will reverse subscription coverage; original
                customer-agreed service prices are restored to their respective
                appointment invoices. Completed appointments will remain
                completed with updated invoice balances.
              </p>

              {/* Financial Impact Breakdown Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-amber-500/20">
                <div className="p-2 rounded-lg bg-background/80 border border-border">
                  <span className="text-[10px] text-muted-foreground block">
                    Affected Appointments
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {preview.affectedAppointmentCount}
                  </span>
                  {preview.breakdown && (
                    <span className="text-[9px] text-muted-foreground block">
                      {preview.breakdown.pendingAppointments ?? 0} pend /{" "}
                      {preview.breakdown.completedAppointments ?? 0} comp
                    </span>
                  )}
                </div>

                <div className="p-2 rounded-lg bg-background/80 border border-border">
                  <span className="text-[10px] text-muted-foreground block">
                    Consumed Entitlements
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {preview.consumedEntitlementCount} units
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-background/80 border border-border col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block">
                    Additional Appointment Charges
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    +
                    {formatCurrency(
                      preview.expectedRebilledSubtotalIncrease || 0,
                    )}
                  </span>
                </div>
              </div>

              {/* Affected Appointments Toggle Table */}
              {preview.affectedAppointments &&
                preview.affectedAppointments.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAffectedAppointments(!showAffectedAppointments)
                      }
                      className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {showAffectedAppointments ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" /> Hide Affected
                          Appointments Breakdown
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> View{" "}
                          {preview.affectedAppointments.length} Affected
                          Appointment(s)
                        </>
                      )}
                    </button>

                    {showAffectedAppointments && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-2">
                        {preview.affectedAppointments.map((apt: AffectedAppointmentPreview) => (
                          <div
                            key={apt.appointmentId}
                            className="p-2 rounded border border-border/60 bg-muted/20 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  {apt.appointmentCode ||
                                    `Apt #${apt.appointmentId.slice(-6)}`}
                                </span>
                                {apt.invoiceNumber && (
                                  <span className="text-[10px] text-muted-foreground">
                                    (Inv: {apt.invoiceNumber})
                                  </span>
                                )}
                              </div>
                              <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {apt.status}
                              </span>
                            </div>
                            {apt.serviceLinesToRebill &&
                              apt.serviceLinesToRebill.length > 0 && (
                                <div className="space-y-0.5 pt-0.5 border-t border-border/40">
                                  {apt.serviceLinesToRebill.map((line: ServiceLineToRebill, idx: number) => (
                                    <div
                                      key={line.appointmentServiceId || idx}
                                      className="flex justify-between text-[10px] text-muted-foreground"
                                    >
                                      <span>{line.serviceName}</span>
                                      <span className="font-semibold text-foreground">
                                        {formatCurrency(
                                          line.restoredRetailPrice,
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          ) : (
            /* Rule A Notice: Cancel unused subscription */
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
              <p className="font-bold text-foreground">
                Rule A: Cancel Unused Subscription
              </p>
              <p className="text-muted-foreground">
                No entitlements have been consumed from this plan. Cancelling
                will close the subscription without additional appointment
                charges or invoice adjustments.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Submission / Server Error Notice */}
      {submissionError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {submissionError}
        </div>
      )}

      {/* SECTION 2: Reason for Cancellation Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reason for Cancellation <span className="text-destructive">*</span>
        </label>
        <Textarea
          placeholder="State the reason for cancellation (e.g. customer relocation, refund request, administrative cleanup)..."
          rows={3}
          disabled={isLoading || !isEligible}
          {...register("reason")}
          className="text-xs"
        />
        {errors.reason && (
          <p className="text-[11px] text-destructive">
            {errors.reason.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="h-9 text-xs cursor-pointer"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={
            isLoading || isPreviewLoading || !isEligible || !canConfigure
          }
          className="h-9 text-xs cursor-pointer gap-1.5 font-semibold"
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isRuleB
            ? "Confirm Cancellation & Restore Charges"
            : "Confirm Cancellation"}
        </Button>
      </div>
    </form>
  );
}
