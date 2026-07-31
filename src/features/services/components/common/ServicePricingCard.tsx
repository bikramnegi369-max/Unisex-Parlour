"use client";

import type { Service } from "../../types/service.types";

interface ServicePricingCardProps {
  service: Service;
}

export function ServicePricingCard({ service }: ServicePricingCardProps) {
  const basePrice = service.pricing?.basePrice ?? 0;
  const specialPrice = service.pricing?.specialPrice;

  return (
    <div className="border border-border/80 rounded-xl bg-card shadow-sm p-6 space-y-6 text-left">
      <div className="border-b border-border/85 pb-4">
        <h3 className="font-semibold text-foreground">Pricing Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base Price</span>
          <p className="text-lg font-bold text-foreground">${basePrice.toFixed(2)}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Special Discount Price</span>
          <p className="text-sm font-semibold text-foreground">
            {specialPrice !== undefined ? `$${specialPrice.toFixed(2)}` : "None configured"}
          </p>
        </div>
      </div>
    </div>
  );
}
