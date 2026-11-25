"use client";

import React from "react";
import Link from "next/link";
import { Scissors, ShoppingBag, ArrowRight } from "lucide-react";
import { TopServiceItem } from "../../types/dashboard.types";

interface ServiceProductAnalyticsCardProps {
  topServices: TopServiceItem[];
  retailProducts: {
    totalQuantitySold: number;
    totalRevenue: number;
  };
}

export function ServiceProductAnalyticsCard({
  topServices,
  retailProducts,
}: ServiceProductAnalyticsCardProps) {
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
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Scissors size={16} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Services & Products
            </h3>
            <p className="text-[11px] text-muted-foreground">
              High-velocity treatments and retail merchandise sales
            </p>
          </div>
        </div>
        <Link
          href="/services"
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 group"
        >
          <span>Catalog</span>
          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Retail Summary Callout */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShoppingBag size={15} />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground">Retail Gross Line Value</span>
            <span className="text-[10px] text-muted-foreground block">
              {retailProducts.totalQuantitySold} items sold (pre-discount gross)
            </span>
          </div>
        </div>
        <span className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400">
          {formatCurrency(retailProducts.totalRevenue)}
        </span>
      </div>

      {/* Top 5 Services List */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Top In-Demand Services (Gross Line Value)
        </div>

        {topServices.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No service sales recorded in this period
          </div>
        ) : (
          <div className="space-y-1.5">
            {topServices.map((service, index) => (
              <div
                key={service.id || index}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex items-center justify-center h-5 w-5 rounded-md bg-muted text-[10px] font-bold font-mono text-muted-foreground shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-foreground truncate">
                    {service.name}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {service.count} visits
                  </span>
                  <span className="font-bold text-foreground font-mono">
                    {formatCurrency(service.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
