import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type {
  Subscription,
  SubscriptionMember,
  SubscriptionEntitlement,
} from "../types/subscription.types";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Layers,
  User,
  Users,
  Building2,
  FileText,
  Gift,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface SubscriptionPlanInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  getBranchName?: (branchId: string) => string;
}

export function SubscriptionPlanInfoModal({
  isOpen,
  onClose,
  subscription,
  getBranchName,
}: SubscriptionPlanInfoModalProps) {
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number>(0);

  if (!subscription) return null;

  const plan =
    typeof subscription.planId === "object" && subscription.planId !== null
      ? subscription.planId
      : null;

  const planName = plan?.name || "Custom Subscription Package";
  const planDescription = plan?.description || "";
  const members: SubscriptionMember[] = Array.isArray(subscription.members)
    ? subscription.members
    : [];
  const isMultiBeneficiary = members.length > 1;

  // Global legacy entitlements or total subscription aggregate
  const globalEntitlements = subscription.entitlements || [];

  // Payer identifiers
  const payerId =
    (typeof subscription.payerCustomerId === "object" &&
    subscription.payerCustomerId !== null
      ? (subscription.payerCustomerId as { id?: string; _id?: string }).id ||
        (subscription.payerCustomerId as { id?: string; _id?: string })._id
      : String(subscription.payerCustomerId || "")) ||
    (typeof subscription.customerId === "object" &&
    subscription.customerId !== null
      ? (subscription.customerId as { id?: string; _id?: string }).id ||
        (subscription.customerId as { id?: string; _id?: string })._id
      : String(subscription.customerId || ""));

  const customerName =
    subscription.customer?.name ||
    subscription.payer?.name ||
    (typeof subscription.customerId === "object" &&
    subscription.customerId !== null
      ? (subscription.customerId as { name?: string }).name
      : "Valued Customer");

  const customerPhone =
    subscription.customer?.phone ||
    subscription.payer?.phone ||
    (typeof subscription.customerId === "object" &&
    subscription.customerId !== null
      ? (subscription.customerId as { phone?: string }).phone
      : "");

  // Safe active member selection
  const activeMember: SubscriptionMember | null =
    isMultiBeneficiary && members[selectedMemberIndex]
      ? members[selectedMemberIndex]
      : members[0] || null;

  // Selected entitlements: show active member's quota if in multi-member mode, otherwise overall entitlements
  const displayedEntitlements: SubscriptionEntitlement[] = isMultiBeneficiary
    ? activeMember?.entitlements || []
    : activeMember?.entitlements?.length
      ? activeMember.entitlements
      : globalEntitlements;

  // Aggregate totals across entire subscription
  const totalAllocatedAll = globalEntitlements.reduce(
    (sum, e) => sum + (e.totalQuantity || 0),
    0,
  );
  const totalRemainingAll = globalEntitlements.reduce(
    (sum, e) => sum + (e.remainingQuantity || 0),
    0,
  );

  // Active member totals
  const memberTotalAllocated = displayedEntitlements.reduce(
    (sum, e) => sum + (e.totalQuantity || 0),
    0,
  );
  const memberTotalRemaining = displayedEntitlements.reduce(
    (sum, e) => sum + (e.remainingQuantity || 0),
    0,
  );

  // Branch access for active view
  const activePermittedBranches =
    isMultiBeneficiary &&
    activeMember?.permittedBranchIds &&
    activeMember.permittedBranchIds.length > 0
      ? activeMember.permittedBranchIds
      : subscription.permittedBranchIds || [];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Subscription Package Details"
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs text-foreground">
        {/* Header Summary Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-primary/5 to-background border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm text-purple-700 dark:text-purple-300">
                {subscription.subscriptionCode}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold uppercase"
              >
                {subscription.status.replace("_", " ")}
              </Badge>
              {isMultiBeneficiary && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-semibold flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  Multi-Beneficiary ({members.length} Members)
                </Badge>
              )}
              {subscription.paymentStatus && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase ${
                    subscription.paymentStatus === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : subscription.paymentStatus === "partially_paid"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}
                >
                  {subscription.paymentStatus.replace("_", " ")}
                </Badge>
              )}
            </div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
              {planName}
            </h3>
            {planDescription && (
              <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                {planDescription}
              </p>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Package Price
            </span>
            <span className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(subscription.price)}
            </span>
            {plan?.suggestedPrice !== undefined &&
              plan.suggestedPrice !== subscription.price && (
                <span className="text-[10px] text-muted-foreground line-through">
                  Catalog: {formatCurrency(plan.suggestedPrice)}
                </span>
              )}
          </div>
        </div>

        {/* Global Validity & Payer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Payer Summary */}
          <div className="p-3 rounded-lg border border-border bg-card/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              <User className="h-3.5 w-3.5 text-primary" />
              Primary Payer
            </div>
            <div className="font-semibold text-sm text-foreground">
              {customerName}
            </div>
            {customerPhone && (
              <div className="text-muted-foreground text-xs flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {customerPhone}
              </div>
            )}
          </div>

          {/* Validity & Overall Branch Policy */}
          <div className="p-3 rounded-lg border border-border bg-card/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Validity Period
            </div>
            <div className="text-xs flex justify-between">
              <span className="text-muted-foreground">Start Date:</span>
              <span className="font-medium">
                {formatDate(subscription.startDate)}
              </span>
            </div>
            <div className="text-xs flex justify-between">
              <span className="text-muted-foreground">Expiry Date:</span>
              <span className="font-medium text-foreground">
                {formatDate(subscription.endDate)}
              </span>
            </div>
          </div>
        </div>

        {/* MULTI-BENEFICIARY SWITCHER (If 2+ members) */}
        {isMultiBeneficiary && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>
                  Beneficiary Members & Entitlements ({members.length})
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Click a beneficiary below to view individual quotas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {members.map((m, idx) => {
                const isSelected = selectedMemberIndex === idx;
                const mCustomerId = String(m.customerId || "");
                const isPayer = mCustomerId === payerId;
                const mRemaining = m.entitlements.reduce(
                  (sum, e) => sum + (e.remainingQuantity || 0),
                  0,
                );
                const mTotal = m.entitlements.reduce(
                  (sum, e) => sum + (e.totalQuantity || 0),
                  0,
                );
                const memberName =
                  m.customer?.name ||
                  (isPayer ? customerName : `Beneficiary #${idx + 1}`);

                return (
                  <button
                    key={mCustomerId || idx}
                    type="button"
                    onClick={() => setSelectedMemberIndex(idx)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500 shadow-2xs"
                        : "border-border bg-card/80 hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-foreground truncate">
                        {memberName}
                      </span>
                      <div className="flex items-center gap-1">
                        {isPayer && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary font-semibold"
                          >
                            Payer
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4 uppercase"
                        >
                          {m.status || "active"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>Available Sessions:</span>
                      <span className="font-mono font-bold text-foreground">
                        {mRemaining} / {mTotal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTIVE MEMBER OR PACKAGE ENTITLEMENTS BREAKDOWN */}
        <div className="space-y-2.5 p-3.5 rounded-xl border border-border bg-card/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border pb-2">
            <div className="space-y-0.5">
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>
                  {isMultiBeneficiary && activeMember
                    ? `${activeMember.customer?.name || (activeMember.customerId === payerId ? customerName : `Beneficiary #${selectedMemberIndex + 1}`)}'s Entitlements`
                    : "Included Service Entitlements"}
                </span>
              </div>
              {/* Member-specific Branch permissions */}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span>Eligible Branches:</span>
                <span className="font-medium text-foreground">
                  {activePermittedBranches.length === 0
                    ? "All Organization Branches"
                    : activePermittedBranches
                        .map((b) => (getBranchName ? getBranchName(b) : b))
                        .join(", ")}
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] text-muted-foreground self-end sm:self-auto">
              Total for this view:{" "}
              <span className="font-mono font-bold text-foreground">
                {memberTotalRemaining}
              </span>{" "}
              remaining of {memberTotalAllocated}
            </div>
          </div>

          {displayedEntitlements.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
              No service entitlements allocated for this beneficiary.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {displayedEntitlements.map((ent, idx) => {
                const remaining = ent.remainingQuantity ?? 0;
                const total = ent.totalQuantity ?? 0;
                const used = ent.usedQuantity ?? 0;
                const percentLeft =
                  total > 0 ? Math.round((remaining / total) * 100) : 0;

                return (
                  <div
                    key={ent.serviceId || idx}
                    className="p-2.5 rounded-lg border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>
                          {ent.serviceName || "Service Package Session"}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>Used: {used}</span>
                        <span>&bull;</span>
                        <span>Remaining: {remaining}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {/* Visual Progress Bar */}
                      <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            remaining === 0
                              ? "bg-muted-foreground"
                              : remaining === 1
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${percentLeft}%` }}
                        />
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-mono font-semibold ${
                          remaining > 0
                            ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {remaining} / {total} left
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Special Terms / Notes */}
        {subscription.notes && (
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" /> Special Terms / Notes
            </span>
            <p className="text-foreground text-xs italic">
              &ldquo;{subscription.notes}&rdquo;
            </p>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Created: {formatDate(subscription.createdAt)}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
