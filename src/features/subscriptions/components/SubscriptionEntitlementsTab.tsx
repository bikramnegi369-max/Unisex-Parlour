import React, { useState } from "react";
import Link from "next/link";
import type { SubscriptionEntitlement, SubscriptionMember } from "../types/subscription.types";
import { Scissors, User, Users } from "lucide-react";

interface SubscriptionEntitlementsTabProps {
  entitlements: SubscriptionEntitlement[];
  members?: SubscriptionMember[];
  payerCustomerId?: string;
}

export function SubscriptionEntitlementsTab({
  entitlements,
  members = [],
  payerCustomerId,
}: SubscriptionEntitlementsTabProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

  const hasMultipleMembers = members.length > 1;

  if ((!entitlements || entitlements.length === 0) && members.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
        No service entitlements configured for this subscription.
      </div>
    );
  }

  // Filter members if a specific member is selected
  const displayedMembers =
    selectedMemberId === "all"
      ? members
      : members.filter((m) => m.customerId === selectedMemberId);

  return (
    <div className="space-y-6">
      {/* Member Filter Chips if multi-member */}
      {hasMultipleMembers && (
        <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
            <Users className="h-3.5 w-3.5" /> Filter by Beneficiary:
          </span>
          <button
            type="button"
            onClick={() => setSelectedMemberId("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedMemberId === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Members ({members.length})
          </button>
          {members.map((m) => {
            const isPayer = m.customerId === payerCustomerId;
            const isSelected = selectedMemberId === m.customerId;
            return (
              <button
                key={m.customerId}
                type="button"
                onClick={() => setSelectedMemberId(m.customerId)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span>{m.customer?.name || `Customer #${m.customerId.slice(-4)}`}</span>
                {isPayer && (
                  <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}>
                    Payer
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Render member sections if members exist */}
      {members.length > 0 ? (
        <div className="space-y-6">
          {displayedMembers.map((member) => {
            const isPayer = member.customerId === payerCustomerId;
            const memberEntitlements = member.entitlements || [];

            return (
              <div
                key={member.customerId}
                className="p-5 rounded-xl border border-border bg-card shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/customers/${member.customerId}`}
                          className="font-bold text-sm text-foreground hover:text-primary hover:underline"
                        >
                          {member.customer?.name || `Customer #${member.customerId.slice(-6)}`}
                        </Link>
                        {isPayer && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Payer & Beneficiary
                          </span>
                        )}
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {member.status || "active"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {member.customer?.phone || `ID: ${member.customerId}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {memberEntitlements.reduce((sum, e) => sum + e.remainingQuantity, 0)} available units
                    </span>
                  </div>
                </div>

                {memberEntitlements.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No service entitlements allocated for this member.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {memberEntitlements.map((ent, idx) => {
                      const usedPct =
                        ent.totalQuantity > 0
                          ? Math.min(
                              100,
                              Math.round((ent.usedQuantity / ent.totalQuantity) * 100),
                            )
                          : 0;

                      return (
                        <div
                          key={ent.serviceId || idx}
                          className="p-3.5 rounded-lg border border-border bg-muted/15 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Scissors className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-foreground truncate max-w-44">
                                  {ent.serviceName || `Service #${ent.serviceId.slice(-4)}`}
                                </h4>
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  ID: {ent.serviceId}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm font-extrabold text-foreground">
                                {ent.remainingQuantity}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                of {ent.totalQuantity} left
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  ent.remainingQuantity === 0
                                    ? "bg-muted-foreground/40"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${100 - usedPct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                              <span>Used: {ent.usedQuantity}</span>
                              <span>Remaining: {ent.remainingQuantity}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Fallback for legacy single-customer subscriptions */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entitlements.map((ent, idx) => {
            const usedPct =
              ent.totalQuantity > 0
                ? Math.min(
                    100,
                    Math.round((ent.usedQuantity / ent.totalQuantity) * 100),
                  )
                : 0;

            const resolvedServiceName =
              ent.serviceName || `Service: ${ent.serviceId}`;

            return (
              <div
                key={ent.serviceId || idx}
                className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground truncate max-w-50">
                        {resolvedServiceName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground">
                        ID: {ent.serviceId}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-foreground">
                      {ent.remainingQuantity}
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      of {ent.totalQuantity} left
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ent.remainingQuantity === 0
                          ? "bg-muted-foreground/40"
                          : "bg-primary"
                      }`}
                      style={{ width: `${100 - usedPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                    <span>
                      Used: {ent.usedQuantity} units ({usedPct}%)
                    </span>
                    <span>Available: {ent.remainingQuantity} units</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
