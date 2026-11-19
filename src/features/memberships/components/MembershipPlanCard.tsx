"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  ShoppingCart,
  Copy,
  Edit2,
  Trash2,
  Building2,
  ShieldCheck,
  Tag,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { MembershipPlan } from "../types/membership.types";
import { useBranches } from "@/features/branches/hooks/useBranches";

interface MembershipPlanCardProps {
  plan: MembershipPlan;
  canSell?: boolean;
  canConfigure?: boolean;
  onSell?: (planId: string) => void;
  onEdit?: (plan: MembershipPlan) => void;
  onDuplicate?: (plan: MembershipPlan) => void;
  onDelete?: (plan: MembershipPlan) => void;
  isSelected?: boolean;
  onSelect?: (planId: string) => void;
}

export function MembershipPlanCard({
  plan,
  canSell = false,
  canConfigure = false,
  onSell,
  onEdit,
  onDuplicate,
  onDelete,
  isSelected = false,
  onSelect,
}: MembershipPlanCardProps) {
  const { branches: allBranches = [] } = useBranches();

  const maxBen = plan.maxBeneficiaries || 1;
  const isIndividual = maxBen === 1;
  const planTypeLabel = isIndividual ? "Individual Plan" : `Family / Group (${maxBen} Members)`;

  // Branch rules summary
  const branchSummary = React.useMemo(() => {
    if (!plan.permittedBranchIds || plan.permittedBranchIds.length === 0) {
      return "All Salon Branches";
    }
    const names = plan.permittedBranchIds
      .map((id) => allBranches.find((b) => b.id === id)?.name || "Branch")
      .slice(0, 2)
      .join(", ");
    const remaining = plan.permittedBranchIds.length - 2;
    return remaining > 0 ? `${names} +${remaining} more` : names;
  }, [plan.permittedBranchIds, allBranches]);

  // Service eligibility summary
  const serviceSummary = React.useMemo(() => {
    const b = plan.benefits;
    if (!b) return "All catalog services";
    const hasInclusions =
      (b.eligibleServiceCategoryIds?.length || 0) > 0 ||
      (b.eligibleServiceIds?.length || 0) > 0;
    const hasExclusions =
      (b.excludedServiceCategoryIds?.length || 0) > 0 ||
      (b.excludedServiceIds?.length || 0) > 0;

    if (!hasInclusions && !hasExclusions) return "All salon services eligible";
    if (hasInclusions && hasExclusions) {
      return `Targeted services (${b.excludedServiceIds?.length || 0} excluded)`;
    }
    if (hasInclusions) {
      return `${b.eligibleServiceCategoryIds?.length || 0} cat(s), ${b.eligibleServiceIds?.length || 0} specific svc(s)`;
    }
    return `All services (${(b.excludedServiceCategoryIds?.length || 0) + (b.excludedServiceIds?.length || 0)} excluded)`;
  }, [plan.benefits]);

  return (
    <Card
      onClick={onSelect ? () => onSelect(plan.id) : undefined}
      className={`relative overflow-hidden border transition-all flex flex-col justify-between ${
        onSelect ? "cursor-pointer" : ""
      } ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md bg-primary/[0.02]"
          : "hover:border-border/80 hover:shadow-xs"
      }`}
    >
      {/* Header Banner */}
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold tracking-wider uppercase border-primary/30 text-primary px-1.5 py-0"
              >
                {plan.tier} Tier
              </Badge>
              <Badge
                variant="secondary"
                className="text-[10px] font-normal px-1.5 py-0 bg-muted text-muted-foreground"
              >
                {planTypeLabel}
              </Badge>
              {!plan.isActive && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  Inactive
                </Badge>
              )}
            </div>
            <CardTitle className="text-base font-bold text-foreground leading-snug pt-0.5">
              {plan.name}
            </CardTitle>
            {plan.code && (
              <CardDescription className="font-mono text-[11px] text-muted-foreground">
                Code: {plan.code}
              </CardDescription>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-foreground tracking-tight">
              {formatCurrency(plan.price)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              / {plan.validityMonths} months
            </span>
          </div>
        </div>

        {plan.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
            {plan.description}
          </p>
        )}
      </CardHeader>

      {/* Body Details */}
      <CardContent className="space-y-3 pt-0 text-xs flex-1">
        {/* Core Discount Metrics */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border bg-muted/30">
          <div>
            <span className="text-[10px] text-muted-foreground block font-medium">
              Service Discount
            </span>
            <span className="text-emerald-600 font-bold text-sm">
              {plan.benefits?.serviceDiscountPercentage || 0}% OFF
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block font-medium">
              Product Discount
            </span>
            <span className="text-emerald-600 font-bold text-sm">
              {plan.benefits?.productDiscountPercentage || 0}% OFF
            </span>
          </div>
        </div>

        {/* Operational Availability Meta */}
        <div className="space-y-1.5 text-[11px] text-muted-foreground border-t pt-2.5">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">
              Valid at: <strong className="text-foreground">{branchSummary}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">
              Services: <strong className="text-foreground">{serviceSummary}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              Beneficiaries:{" "}
              <strong className="text-foreground">
                Max {maxBen} customer{maxBen > 1 ? "s" : ""}
              </strong>
            </span>
          </div>
        </div>

        {/* Included Complimentary Perks */}
        {plan.benefits?.complimentaryPerks && plan.benefits.complimentaryPerks.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Complimentary Perks:
            </span>
            <div className="flex flex-wrap gap-1">
              {plan.benefits.complimentaryPerks.slice(0, 3).map((perk, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-secondary text-secondary-foreground"
                >
                  <Check className="w-2.5 h-2.5 text-emerald-600" /> {perk}
                </span>
              ))}
              {plan.benefits.complimentaryPerks.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{plan.benefits.complimentaryPerks.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Action Toolbar */}
      {(canSell || canConfigure) && (
        <div className="p-3 border-t bg-muted/15 flex items-center justify-between gap-2">
          {canSell && onSell && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSell(plan.id);
              }}
              className="gap-1.5 text-xs h-8 flex-1 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Sell Membership
            </Button>
          )}

          {canConfigure && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {onDuplicate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDuplicate(plan)}
                  className="h-8 px-2 text-xs cursor-pointer"
                  title="Duplicate Plan"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(plan)}
                  className="h-8 px-2 text-xs cursor-pointer"
                  title="Edit Plan"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(plan)}
                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                  title="Deactivate Plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
