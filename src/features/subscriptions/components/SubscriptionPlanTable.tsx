import React from "react";
import { formatCurrency } from "@/lib/formatters";
import { Layers, Edit3, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServices } from "@/features/services/hooks/services/useServices";
import type { Service } from "@/features/services/types/service.types";
import type { SubscriptionPlan } from "../types/plan.types";

interface SubscriptionPlanTableProps {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
  onSelectForCustomer?: (plan: SubscriptionPlan) => void;
  canConfigure: boolean;
}

export function SubscriptionPlanTable({
  plans,
  isLoading,
  onEdit,
  onDelete,
  onSelectForCustomer,
  canConfigure,
}: SubscriptionPlanTableProps) {
  const { data: servicesData } = useServices({ limit: "all" });
  const services = servicesData?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border bg-card space-y-2 animate-pulse"
          >
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-20 bg-muted rounded" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (plans.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const totalSessions = (plan.entitlements || []).reduce(
          (acc, e) => acc + e.quantity,
          0,
        );

        return (
          <div
            key={plan.id}
            className="flex flex-col justify-between rounded-xl border border-border bg-card hover:border-primary/40 transition-all shadow-sm p-4 space-y-3 relative group"
          >
            <div className="space-y-2">
              {/* Header: Name & Validity */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {plan.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-sm text-primary">
                    {formatCurrency(plan.suggestedPrice)}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    {plan.validityMonths}m validity
                  </div>
                </div>
              </div>

              {/* Entitlement Quotas pill list */}
              <div className="pt-2 border-t border-border/70 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Included Services ({plan.entitlements?.length || 0})
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {totalSessions} total sessions
                  </span>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {plan.entitlements?.map((ent, idx) => {
                    const srv = services.find((s: Service) => s.id === ent.serviceId);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] bg-muted/40 px-2 py-1 rounded border border-border/40"
                      >
                        <span className="text-foreground font-medium truncate max-w-40">
                          {srv?.name ||
                            ent.serviceName ||
                            "Service #" + ent.serviceId.slice(-4)}
                        </span>
                        <span className="font-mono font-semibold text-muted-foreground">
                          × {ent.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
              {onSelectForCustomer && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectForCustomer(plan)}
                  className="h-7 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Use Template
                </Button>
              )}

              {canConfigure && (
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(plan)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(plan)}
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
