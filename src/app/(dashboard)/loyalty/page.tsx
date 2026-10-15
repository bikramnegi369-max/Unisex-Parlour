"use client";

import React, { useState } from "react";
import { Award, Users, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useCustomer } from "@/features/customers/hooks/useCustomer";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { LoyaltyProgramConfigCard } from "@/features/loyalty/components/LoyaltyProgramConfigCard";
import { CustomerLoyaltyLedgerTable } from "@/features/loyalty/components/CustomerLoyaltyLedgerTable";
import { ManualPointsAdjustDialog } from "@/features/loyalty/components/ManualPointsAdjustDialog";

export default function LoyaltyDashboardPage() {
  const { user } = useAuth();
  const canAdjust = hasPermission(user, "loyalty.adjust");

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(
    selectedCustomerId || null
  );

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Loyalty & Rewards
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage program configuration, monitor customer point balances, and audit transaction ledgers.
            </p>
          </div>
        </div>
      </div>

      {/* Program Settings Card */}
      <LoyaltyProgramConfigCard />

      {/* Customer Loyalty Search & Ledger Explorer */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Customer Loyalty Explorer</h2>
              <p className="text-xs text-muted-foreground">
                Search a customer by name or phone to review point balance, debt status, and transaction ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Reusable Customer Search by Name / Phone */}
        <div className="max-w-md">
          <label className="text-xs font-semibold text-foreground block mb-1.5">
            Search Customer (by Name or Phone)
          </label>
          <CustomerSelector
            value={selectedCustomerId || ""}
            onChange={(customerId) => {
              setSelectedCustomerId(customerId || null);
            }}
          />
        </div>

        {/* Selected Customer View */}
        {selectedCustomerId && (
          <div className="pt-2 space-y-4">
            {isLoadingCustomer ? (
              <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
            ) : customer ? (
              <div className="p-4 bg-muted/30 border border-border/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{customer.name}</span>
                    <span className="text-muted-foreground">({customer.phone})</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-muted-foreground">
                      Spendable Points:{" "}
                      <strong className="text-foreground">{customer.loyaltyPoints ?? 0} pts</strong>
                    </span>
                    {(customer.loyaltyPointsDebt ?? 0) > 0 && (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        Debt: {customer.loyaltyPointsDebt} pts
                      </span>
                    )}
                  </div>
                </div>

                {canAdjust && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAdjustOpen(true)}
                    className="text-xs h-8 gap-1.5 font-semibold"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Adjust Points
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-4 text-xs text-muted-foreground border border-border/60 rounded-xl">
                Customer not found with ID {selectedCustomerId}.
              </div>
            )}

            {/* Transaction Ledger Table */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <History className="h-4 w-4 text-primary" />
                <span>Transaction History</span>
              </div>
              <CustomerLoyaltyLedgerTable customerId={selectedCustomerId} />
            </div>
          </div>
        )}
      </div>

      {/* Manual Adjust Modal Dialog */}
      {selectedCustomerId && customer && (
        <ManualPointsAdjustDialog
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          customerId={customer.id}
          customerName={customer.name}
          currentPoints={customer.loyaltyPoints ?? 0}
          currentDebt={customer.loyaltyPointsDebt ?? 0}
        />
      )}
    </div>
  );
}
