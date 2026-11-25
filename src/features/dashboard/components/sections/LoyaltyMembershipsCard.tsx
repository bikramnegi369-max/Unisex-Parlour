"use client";

import React from "react";
import Link from "next/link";
import { Crown, Sparkles, Tag, Gift, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoyaltyMembershipsCardProps {
  memberships?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    activeCount: number;
    expiringCount: number;
    newSoldInPeriod: number;
    salesAmountInPeriod?: number;
    error?: string;
  };
  subscriptions?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    activeCount: number;
    expiringCount: number;
    redemptionsInPeriod: number;
    soldInPeriod?: number;
    salesAmountInPeriod?: number;
    error?: string;
  };
  coupons?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    redemptionCount: number;
    totalDiscountGiven: number;
    error?: string;
  };
  loyalty?: {
    status: "AVAILABLE" | "FAILED" | "EMPTY" | "UNAVAILABLE";
    pointsEarned: number;
    pointsRedeemed: number;
    error?: string;
  };
}

export function LoyaltyMembershipsCard({
  memberships,
  subscriptions,
  coupons,
  loyalty,
}: LoyaltyMembershipsCardProps) {
  const hasMemberships = memberships && memberships.status !== "UNAVAILABLE";
  const hasSubscriptions = subscriptions && subscriptions.status !== "UNAVAILABLE";
  const hasCoupons = coupons && coupons.status !== "UNAVAILABLE";
  const hasLoyalty = loyalty && loyalty.status !== "UNAVAILABLE";

  if (!hasMemberships && !hasSubscriptions && !hasCoupons && !hasLoyalty) {
    return null;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex flex-col p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
            <Crown size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Memberships, Subscriptions & Loyalty
            </h3>
            <p className="text-[11px] text-muted-foreground">
              VIP tiers, prepaid service packages, discounts, and reward points
            </p>
          </div>
        </div>
        <Link
          href="/memberships"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 group"
        >
          <span>Programs</span>
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid of 4 modular cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Tier Memberships */}
        {hasMemberships && (
          <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/20 flex flex-col justify-between">
            {memberships.status === "FAILED" ? (
              <div className="text-[11px] text-rose-500 font-medium">
                Memberships unavailable: {memberships.error || "Failed to load"}
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                    <Crown size={12} />
                    <span>Tier Memberships</span>
                  </span>
                  <span className="text-lg font-extrabold font-mono text-pink-600 dark:text-pink-400 mt-1 block">
                    {memberships.activeCount} Active
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-2 flex justify-between">
                  <span>
                    +{memberships.newSoldInPeriod} sold
                    {typeof memberships.salesAmountInPeriod === "number"
                      ? ` (${formatCurrency(memberships.salesAmountInPeriod)})`
                      : ""}
                  </span>
                  <span className="text-amber-600 font-semibold">{memberships.expiringCount} expiring</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Service Subscriptions (Packages) */}
        {hasSubscriptions && (
          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col justify-between">
            {subscriptions.status === "FAILED" ? (
              <div className="text-[11px] text-rose-500 font-medium">
                Packages unavailable: {subscriptions.error || "Failed to load"}
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Sparkles size={12} />
                    <span>Subscriptions</span>
                  </span>
                  <span className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {subscriptions.activeCount} Active
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-2 space-y-0.5">
                  <div className="flex justify-between">
                    <span>{subscriptions.redemptionsInPeriod} redeemed</span>
                    <span className="text-amber-600 font-semibold">{subscriptions.expiringCount} expiring</span>
                  </div>
                  {typeof subscriptions.soldInPeriod === "number" && (
                    <div>
                      +{subscriptions.soldInPeriod} sold
                      {typeof subscriptions.salesAmountInPeriod === "number"
                        ? ` (${formatCurrency(subscriptions.salesAmountInPeriod)})`
                        : ""}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Coupons */}
        {hasCoupons && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                <Tag size={12} />
                <span>Coupons Redeemed</span>
              </span>
              <span className="text-lg font-extrabold font-mono text-foreground mt-1 block">
                {coupons.redemptionCount}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2">
              Discounts: {formatCurrency(coupons.totalDiscountGiven)}
            </span>
          </div>
        )}

        {/* Loyalty Reward Points */}
        {hasLoyalty && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                <Gift size={12} />
                <span>Loyalty Points</span>
              </span>
              <span className="text-lg font-extrabold font-mono text-foreground mt-1 block">
                {loyalty.pointsEarned.toLocaleString()} Earned
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2">
              {loyalty.pointsRedeemed.toLocaleString()} Redeemed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
