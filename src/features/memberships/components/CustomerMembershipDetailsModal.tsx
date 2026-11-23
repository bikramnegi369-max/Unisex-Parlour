"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import type {
  CustomerMembership,
  MembershipUsageRecord,
} from "../types/membership.types";
import {
  useMembershipPurchaseGroup,
  useMembershipUsageHistory,
  useTriggerRenewalReminder,
} from "../hooks/useMemberships";
import { useBranches } from "@/features/branches/hooks/useBranches";
import {
  Crown,
  Calendar,
  User,
  Users,
  CreditCard,
  Percent,
  ExternalLink,
  History,
  BellRing,
  AlertCircle,
} from "lucide-react";

interface CustomerMembershipDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  membership: CustomerMembership | null;
}

export function CustomerMembershipDetailsModal({
  isOpen,
  onClose,
  membership,
}: CustomerMembershipDetailsModalProps) {
  const { branches = [] } = useBranches();

  // If part of a purchase group, load group beneficiaries and financial links
  const { data: purchaseGroup } = useMembershipPurchaseGroup(
    membership?.id || "",
  );

  const [selectedMemberTab, setSelectedMemberTab] = useState<number>(0);
  const [activeView, setActiveView] = useState<"details" | "usage">("details");
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  // Authoritative Membership Usage History query
  const { data: usageData, isLoading: isLoadingUsage } =
    useMembershipUsageHistory(membership?.id, { limit: 20 });

  // Renewal reminder mutation
  const triggerReminder = useTriggerRenewalReminder();

  const handleSendReminder = async () => {
    if (!membership?.id) return;
    try {
      const res = await triggerReminder.mutateAsync({
        membershipId: membership.id,
        channel: "sms",
      });
      if (res.skipped) {
        setReminderMessage(`Reminder already sent: ${res.reason || "Skipped"}`);
      } else {
        setReminderMessage(`Renewal reminder successfully sent via SMS!`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to trigger reminder";
      setReminderMessage(`Error: ${msg}`);
    }
  };

  if (!isOpen || !membership) return null;

  const planSnapshot = membership.planSnapshot || {
    name: "Membership Plan",
    tier: "Standard",
    price: 0,
    validityMonths: 12,
    benefits: {
      serviceDiscountPercentage: 0,
      productDiscountPercentage: 0,
      complimentaryPerks: [],
    },
  };

  const payerName =
    membership.payer?.name ||
    (typeof membership.payerCustomerId === "object" &&
    membership.payerCustomerId !== null
      ? (membership.payerCustomerId as { name?: string }).name
      : null) ||
    membership.customer?.name ||
    "Customer";

  const payerPhone =
    membership.payer?.phone ||
    (typeof membership.payerCustomerId === "object" &&
    membership.payerCustomerId !== null
      ? (membership.payerCustomerId as { phone?: string }).phone
      : null) ||
    membership.customer?.phone ||
    "";

  const groupMembers = purchaseGroup?.members || [membership];
  const activeMember = groupMembers[selectedMemberTab] || membership;
  const activeMemberBenefits =
    activeMember.planSnapshot?.benefits || planSnapshot.benefits;

  const activeCustomer =
    activeMember.customer ||
    (typeof activeMember.customerId === "object" &&
    activeMember.customerId !== null
      ? (activeMember.customerId as { name?: string; phone?: string })
      : null);

  const currentMemberName =
    activeCustomer?.name ||
    (typeof activeMember.customerId === "string"
      ? activeMember.customerId
      : `Member #${selectedMemberTab + 1}`);

  const currentMemberPhone = activeCustomer?.phone || "";

  const isCurrentMemberPrimary =
    activeMember.isPrimary === true ||
    activeMember.payerCustomerId === activeMember.customerId ||
    (typeof activeMember.payerCustomerId === "object" &&
      typeof activeMember.customerId === "object" &&
      activeMember.payerCustomerId !== null &&
      activeMember.customerId !== null &&
      (activeMember.payerCustomerId as { _id?: string; id?: string })._id ===
        (activeMember.customerId as { _id?: string; id?: string })._id);

  const permittedBranchNames = (membership.permittedBranchIds || []).map(
    (bId) => {
      const found = branches.find(
        (b) => b.id === bId || (b as { _id?: string })._id === bId,
      );
      return found ? found.name : bId;
    },
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            Active
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
            Pending Payment
          </Badge>
        );
      case "suspended":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
            Suspended
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "expired":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const invoiceObj =
    typeof membership.invoiceId === "object" && membership.invoiceId !== null
      ? membership.invoiceId
      : null;
  const invoiceIdStr = invoiceObj
    ? invoiceObj.id || invoiceObj._id
    : typeof membership.invoiceId === "string"
      ? membership.invoiceId
      : null;
  const invoiceNumber =
    invoiceObj?.invoiceNumber ||
    (invoiceIdStr ? `#${invoiceIdStr.slice(-6).toUpperCase()}` : null);
  const invoicePaymentStatus =
    invoiceObj?.paymentStatus ||
    (membership.status === "active" ? "paid" : "unpaid");

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Membership Details — ${membership.membershipCode}`}
      maxWidth="2xl"
    >
      <div className="space-y-6 py-2 px-1">
        {/* Hero Card */}
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Crown className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {planSnapshot.name}
                </h3>
                <p className="text-xs font-mono font-medium text-amber-700 dark:text-amber-400">
                  {membership.membershipCode}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="border-amber-400 text-amber-800 dark:text-amber-300 font-semibold text-xs"
            >
              {planSnapshot.tier} Tier
            </Badge>
            {getStatusBadge(membership.status)}
          </div>
        </div>

        {/* View Switcher: Details vs Usage History */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Button
            variant={activeView === "details" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("details")}
            className="text-xs h-7 gap-1"
          >
            <Crown className="w-3.5 h-3.5" />
            Plan & Benefits
          </Button>
          <Button
            variant={activeView === "usage" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveView("usage")}
            className="text-xs h-7 gap-1"
          >
            <History className="w-3.5 h-3.5" />
            Usage History ({usageData?.usage?.length || 0})
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendReminder}
              disabled={
                triggerReminder.isPending ||
                !["active", "pending_payment"].includes(membership.status)
              }
              className="text-xs h-7 gap-1 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
            >
              <BellRing className="w-3.5 h-3.5" />
              {triggerReminder.isPending
                ? "Sending..."
                : "Send Renewal Reminder"}
            </Button>
          </div>
        </div>

        {reminderMessage && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-foreground">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{reminderMessage}</span>
          </div>
        )}

        {/* View 1: Details */}
        {activeView === "details" && (
          <>
            {/* Multi-beneficiary group selector if >1 members */}
            {groupMembers.length > 1 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Enrolled Beneficiaries ({groupMembers.length})
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {groupMembers.map((m: CustomerMembership, idx: number) => {
                    const name =
                      m.customer?.name ||
                      (typeof m.customerId === "object" && m.customerId !== null
                        ? (m.customerId as { name?: string }).name
                        : `Beneficiary #${idx + 1}`);
                    const isSelected = selectedMemberTab === idx;
                    const isPrimary =
                      m.isPrimary === true ||
                      m.payerCustomerId === m.customerId ||
                      (typeof m.payerCustomerId === "object" &&
                        typeof m.customerId === "object" &&
                        m.payerCustomerId !== null &&
                        m.customerId !== null &&
                        (m.payerCustomerId as { _id?: string; id?: string })
                          ._id ===
                          (m.customerId as { _id?: string; id?: string })._id);

                    return (
                      <button
                        key={m.id || idx}
                        type="button"
                        onClick={() => setSelectedMemberTab(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold"
                            : "bg-card border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <User className="w-3 h-3" />
                        <span>{name}</span>
                        <Badge
                          variant={isPrimary ? "default" : "outline"}
                          className={`text-[9px] px-1 py-0 h-4 ${
                            isPrimary
                              ? "bg-amber-600 text-white"
                              : "text-muted-foreground border-border"
                          }`}
                        >
                          {isPrimary ? "Primary" : "Beneficiary"}
                        </Badge>
                        {m.id === membership.id && (
                          <span className="text-[10px] opacity-75">
                            (Current)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Information Grid: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Col 1: Customer & Payer */}
              <div className="p-3.5 rounded-xl border bg-card space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                  <User className="w-3.5 h-3.5 text-primary" /> Member & Payer
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground block text-[11px]">
                        Selected Member
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-3.5 border-amber-500/30 text-amber-700 dark:text-amber-300"
                      >
                        {isCurrentMemberPrimary
                          ? "Primary Member"
                          : "Additional Beneficiary"}
                      </Badge>
                    </div>
                    <span className="font-semibold text-foreground">
                      {currentMemberName}
                    </span>
                    {currentMemberPhone && (
                      <span className="text-muted-foreground block text-[11px] font-mono">
                        {currentMemberPhone}
                      </span>
                    )}
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <span className="text-muted-foreground block text-[11px]">
                      Payer / Account Owner
                    </span>
                    <span className="font-medium text-foreground">
                      {payerName}
                    </span>
                    {payerPhone && (
                      <span className="text-muted-foreground block text-[11px] font-mono">
                        {payerPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Col 2: Validity & Dates */}
              <div className="p-3.5 rounded-xl border bg-card space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Validity &
                  Schedule
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Validity Duration
                    </span>
                    <span className="font-semibold text-foreground">
                      {planSnapshot.validityMonths} Months
                    </span>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <span className="text-muted-foreground block text-[11px]">
                      Active Period
                    </span>
                    <span className="font-mono text-[11px] text-foreground">
                      {membership.startDate
                        ? formatDate(membership.startDate)
                        : "N/A"}{" "}
                      →{" "}
                      {membership.endDate
                        ? formatDate(membership.endDate)
                        : "N/A"}
                    </span>
                  </div>
                  {permittedBranchNames.length > 0 && (
                    <div className="pt-1 border-t border-border/50">
                      <span className="text-muted-foreground block text-[11px]">
                        Branch Eligibility
                      </span>
                      <span className="text-[11px] text-foreground font-medium">
                        {permittedBranchNames.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Col 3: Financial & Invoice */}
              <div className="p-3.5 rounded-xl border bg-card space-y-3">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Financials
                  & Billing
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">
                      Enrolled Price
                    </span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatCurrency(planSnapshot.price || 0)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <span className="text-muted-foreground block text-[11px]">
                      Linked Invoice
                    </span>
                    {invoiceNumber ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {invoiceIdStr ? (
                          <a
                            href={`/billing/${invoiceIdStr}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono font-semibold text-primary hover:underline flex items-center gap-1 text-xs"
                          >
                            {invoiceNumber}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="font-mono font-semibold text-foreground">
                            {invoiceNumber}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 uppercase"
                        >
                          {invoicePaymentStatus}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px] italic">
                        No invoice linked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Benefits & Discount Rules */}
            <div className="p-4 rounded-xl border bg-card space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border">
                <Percent className="w-3.5 h-3.5 text-primary" /> Configured
                Benefits & Privileges
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Service Discount
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {activeMemberBenefits?.serviceDiscountPercentage ?? 0}% OFF
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Applies automatically to salon treatments & services in
                    basket
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                  <span className="text-muted-foreground text-[11px]">
                    Retail Product Discount
                  </span>
                  <div className="text-base font-bold text-foreground">
                    {activeMemberBenefits?.productDiscountPercentage ?? 0}% OFF
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Applies automatically to retail inventory items in basket
                  </span>
                </div>
              </div>

              {Array.isArray(activeMemberBenefits?.complimentaryPerks) &&
                activeMemberBenefits.complimentaryPerks.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-xs font-semibold text-muted-foreground block mb-1">
                      Complimentary Perks & Benefits:
                    </span>
                    <ul className="list-disc list-inside text-xs space-y-0.5 text-foreground">
                      {activeMemberBenefits.complimentaryPerks.map(
                        (perk: string, i: number) => (
                          <li key={i}>{perk}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
            </div>

            {/* Notes & Audit */}
            {membership.notes && (
              <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
                <span className="font-semibold text-muted-foreground block text-[11px]">
                  Notes:
                </span>
                <p className="italic text-foreground">
                  &ldquo;{membership.notes}&rdquo;
                </p>
              </div>
            )}
          </>
        )}

        {/* View 2: Usage History */}
        {activeView === "usage" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Authoritative Discount Usage Records</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Total: {usageData?.usage?.length || 0} benefits applied
              </span>
            </div>

            {isLoadingUsage ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Loading usage transactions...
              </div>
            ) : !usageData?.usage || usageData.usage.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed text-center text-xs text-muted-foreground space-y-1">
                <History className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="font-medium">No discount usage records yet</p>
                <p className="text-[11px]">
                  When services or retail products are billed with this
                  membership discount, authoritative transaction records will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg divide-y text-xs overflow-hidden">
                {usageData.usage.map((rec: MembershipUsageRecord) => (
                  <div
                    key={rec.id}
                    className="p-3 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {rec.itemName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-4 uppercase"
                        >
                          {rec.itemType}
                        </Badge>
                        <span className="text-muted-foreground text-[11px]">
                          × {rec.quantity}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>Invoice: #{rec.invoiceNumber}</span>
                        <span>•</span>
                        <span>{formatDate(rec.usedAt)}</span>
                        {rec.branch?.name && (
                          <>
                            <span>•</span>
                            <span>{rec.branch.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right sm:shrink-0">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(rec.membershipDiscountAmount || 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Charged:{" "}
                        {formatCurrency(
                          Number.isFinite(rec.finalPrice) ? rec.finalPrice : 0,
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-xs"
        >
          Close Details
        </Button>
      </div>
    </Dialog>
  );
}
