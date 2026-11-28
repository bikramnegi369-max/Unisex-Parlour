"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import type { RefundContextResponse } from "../../api/billing.api";

interface RefundOverviewStageProps {
  context: RefundContextResponse;
}

export function RefundOverviewStage({ context }: RefundOverviewStageProps) {
  const [expandedBenefitIds, setExpandedBenefitIds] = useState<
    Record<string, boolean>
  >({});

  const { summary } = context;

  return (
    <div className="space-y-6">
      {/* Stage A: Purchase Overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Purchase &amp; Financial Summary
          </h3>
          <span className="text-xs text-muted-foreground">
            {context.invoiceDate ? formatDateTime(context.invoiceDate) : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border bg-card p-4 text-xs">
          <div>
            <div className="text-muted-foreground">Original Payable</div>
            <div className="mt-1 text-sm font-semibold">
              {formatCurrency(summary.originalPayablePaise / 100)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Collected</div>
            <div className="mt-1 text-sm font-semibold">
              {formatCurrency(summary.completedPaymentsPaise / 100)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Completed Refunds</div>
            <div className="mt-1 text-sm font-semibold text-rose-600">
              {formatCurrency(summary.completedRefundsPaise / 100)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Pending Reserved</div>
            <div className="mt-1 text-sm font-semibold text-amber-600">
              {formatCurrency(summary.pendingReservedPaise / 100)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Net Retained</div>
            <div className="mt-1 text-sm font-semibold">
              {formatCurrency(summary.netRetainedPaise / 100)}
            </div>
          </div>
        </div>
      </section>

      {/* Reconciliation Warning */}
      {context.reconciliationRequired && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Manual Reconciliation Required</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {(context.reconciliationReasons || []).map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stage B: Historical Benefit Usage */}
      {context.benefitAccounting && context.benefitAccounting.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Historical Membership &amp; Subscription Usage
          </h3>
          <div className="space-y-2.5">
            {context.benefitAccounting.map((benefit) => {
              const isExpanded = !!expandedBenefitIds[benefit.lineId];
              return (
                <div
                  key={benefit.lineId}
                  className="rounded-xl border bg-card p-4 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {benefit.name}
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {benefit.entitlementType}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() =>
                        setExpandedBenefitIds((prev) => ({
                          ...prev,
                          [benefit.lineId]: !prev[benefit.lineId],
                        }))
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isExpanded
                          ? "Hide evidence"
                          : `Evidence (${benefit.usageHistory.length})`}
                      </span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t pt-3">
                    <div>
                      <div className="text-muted-foreground">Net Paid</div>
                      <div className="font-semibold">
                        {formatCurrency(benefit.originalNetPaidPaise / 100)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Lifetime Consumed
                      </div>
                      <div className="font-semibold text-rose-600">
                        -{formatCurrency(benefit.lifetimeConsumedPaise / 100)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Prior / Pending Refunds
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(
                          (benefit.previouslySettledRefundsPaise +
                            benefit.pendingRefundReservationsPaise) /
                            100,
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">
                        Remaining Refundable
                      </div>
                      <div className="font-semibold text-primary">
                        {formatCurrency(benefit.remainingRefundablePaise / 100)}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t pt-3 space-y-1.5">
                      {benefit.usageHistory.length === 0 ? (
                        <div className="text-muted-foreground">
                          No historical usage recorded.
                        </div>
                      ) : (
                        <div className="divide-y rounded-lg border bg-muted/20">
                          {benefit.usageHistory.map((u) => (
                            <div
                              key={u.usageId}
                              className="flex items-center justify-between px-3 py-2 text-[11px]"
                            >
                              <div>
                                <div className="font-medium text-foreground">
                                  {u.itemName} (x{u.quantity})
                                </div>
                                <div className="text-muted-foreground">
                                  {u.invoiceNumber} • {u.branchName} •{" "}
                                  {formatDateTime(u.date)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  -{formatCurrency(u.consumedPaise / 100)}
                                </div>
                                <div className="text-muted-foreground capitalize">
                                  {u.status}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
