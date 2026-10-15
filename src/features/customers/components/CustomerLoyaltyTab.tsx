"use client";

import React, { useState } from "react";
import { Sparkles, ShieldAlert, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useCustomer } from "../hooks/useCustomer";
import { CustomerLoyaltyLedgerTable } from "@/features/loyalty/components/CustomerLoyaltyLedgerTable";
import { ManualPointsAdjustDialog } from "@/features/loyalty/components/ManualPointsAdjustDialog";

interface CustomerLoyaltyTabProps {
  customerId: string;
}

export function CustomerLoyaltyTab({ customerId }: CustomerLoyaltyTabProps) {
  const { user } = useAuth();
  const canAdjust = hasPermission(user, "loyalty.adjust");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const { data: customer, isLoading } = useCustomer(customerId);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4 animate-pulse">
        <div className="h-24 bg-muted/40 rounded-xl" />
        <div className="h-64 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  if (!customer) return null;

  const spendablePoints = customer.loyaltyPoints ?? 0;
  const loyaltyDebt = customer.loyaltyPointsDebt ?? 0;

  return (
    <div className="space-y-6">
      {/* Balance Summary Header Card */}
      <div className="p-5 bg-card border border-border/80 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Loyalty Account Balance</h3>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                Spendable Points
              </p>
              <p className="text-2xl font-black text-primary mt-1">
                {spendablePoints} pts
              </p>
            </div>

            {loyaltyDebt > 0 && (
              <div className="pl-4 border-l border-border/60">
                <p className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 leading-none">
                  Loyalty Points Debt
                </p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {loyaltyDebt} pts
                </p>
              </div>
            )}
          </div>
        </div>

        {canAdjust && (
          <Button
            size="sm"
            onClick={() => setIsAdjustOpen(true)}
            className="text-xs h-9 gap-1.5 font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Adjust Points
          </Button>
        )}
      </div>

      {/* Debt Informational Notice */}
      {loyaltyDebt > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-[11px] uppercase tracking-wider">
              Outstanding Loyalty Liability Notice
            </p>
            <p className="text-muted-foreground dark:text-amber-300/90 leading-relaxed">
              This customer currently has a positive loyalty debt of {loyaltyDebt} points, resulting from a voided payment or refunded invoice. Points earned from future visits will first offset this outstanding liability before contributing to spendable points.
            </p>
          </div>
        </div>
      )}

      {/* Paginated Transaction Ledger */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Transaction Ledger & History
        </h4>
        <CustomerLoyaltyLedgerTable customerId={customerId} />
      </div>

      {/* Adjustment Dialog Modal */}
      <ManualPointsAdjustDialog
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
        currentPoints={spendablePoints}
        currentDebt={loyaltyDebt}
      />
    </div>
  );
}
