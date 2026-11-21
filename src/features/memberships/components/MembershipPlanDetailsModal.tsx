"use client";

import React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { useBranches } from "@/features/branches/hooks/useBranches";
import {
  CreditCard,
  Users,
  Sparkles,
  Percent,
  Check,
  Calendar,
  Building2,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import type { MembershipPlan } from "../types/membership.types";

interface MembershipPlanDetailsModalProps {
  plan: MembershipPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planId: string) => void;
  isSelected?: boolean;
}

export function MembershipPlanDetailsModal({
  plan,
  isOpen,
  onClose,
  onSelectPlan,
  isSelected = false,
}: MembershipPlanDetailsModalProps) {
  const { branches: allBranches = [] } = useBranches();

  if (!isOpen || !plan) return null;

  const maxBen = plan.maxBeneficiaries || 1;
  const isIndividual = maxBen === 1;

  const permittedBranches = (plan.permittedBranchIds || []).map((bId) => {
    const found = allBranches.find((b) => b.id === bId || (b as { _id?: string })._id === bId);
    return found ? found.name : bId;
  });

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${plan.name} — Full Plan Specifications`}
      maxWidth="lg"
    >
      <div className="space-y-5 py-2">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-semibold text-xs bg-background/80">
                {plan.tier} Tier
              </Badge>
              {plan.code && (
                <span className="font-mono text-xs text-muted-foreground">
                  #{plan.code}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            {plan.description && (
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                {plan.description}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <div className="text-2xl font-black text-primary">
              {formatCurrency(plan.price)}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">
              Valid for {plan.validityDuration || plan.validityMonths}{" "}
              {plan.validityUnit || "months"}
            </span>
          </div>
        </div>

        {/* Core Attributes Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-lg border bg-card space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Percent className="w-3.5 h-3.5 text-primary" /> Service Discount
            </span>
            <p className="text-sm font-bold text-foreground">
              {plan.benefits?.serviceDiscountPercentage ?? 0}% Off
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-card space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Percent className="w-3.5 h-3.5 text-emerald-600" /> Retail Discount
            </span>
            <p className="text-sm font-bold text-foreground">
              {plan.benefits?.productDiscountPercentage ?? 0}% Off
            </p>
          </div>

          <div className="p-3 rounded-lg border bg-card space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-600" /> Plan Capacity
            </span>
            <p className="text-sm font-bold text-foreground">
              {isIndividual ? "Individual (1 Member)" : `Up to ${maxBen} Members`}
            </p>
          </div>
        </div>

        {/* Branch Scope */}
        <div className="space-y-2 border-t pt-3">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <Building2 className="w-4 h-4 text-primary" /> Permitted Salon Branches
          </span>
          <div className="flex flex-wrap gap-1.5">
            {permittedBranches.length === 0 ? (
              <Badge variant="secondary" className="text-xs">
                All Salon Branches
              </Badge>
            ) : (
              permittedBranches.map((bName, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {bName}
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Complimentary Perks */}
        {plan.benefits?.complimentaryPerks && plan.benefits.complimentaryPerks.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" /> Included Privileges & Perks
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.benefits.complimentaryPerks.map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs text-foreground"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms */}
        {plan.termsAndConditions && (
          <div className="space-y-1.5 border-t pt-3">
            <span className="text-xs font-semibold text-muted-foreground">
              Terms & Conditions
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded border">
              {plan.termsAndConditions}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Close
          </Button>
          {onSelectPlan && (
            <Button
              size="sm"
              disabled={isSelected}
              onClick={() => {
                onSelectPlan(plan.id);
                onClose();
              }}
              className="h-8 text-xs gap-1.5"
            >
              {isSelected ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Selected
                </>
              ) : (
                <>Select This Plan</>
              )}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
