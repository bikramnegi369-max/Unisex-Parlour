"use client";

import type { Service } from "../../types/service.types";
import { Badge } from "@/components/ui/badge";

interface ServiceTaxCardProps {
  service: Service;
}

export function ServiceTaxCard({ service }: ServiceTaxCardProps) {
  const isTaxable = service.taxable;
  const taxRate = service.taxRate ?? 0;

  return (
    <div className="border border-border/80 rounded-xl bg-card shadow-sm p-6 space-y-6 text-left">
      <div className="border-b border-border/85 pb-4">
        <h3 className="font-semibold text-foreground">Tax Configurations</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxability Status</span>
          <div>
            <Badge variant={isTaxable ? "success" : "muted"}>
              {isTaxable ? "Taxable" : "Exempt"}
            </Badge>
          </div>
        </div>
        {isTaxable && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applied Tax Rate</span>
            <p className="text-sm font-semibold text-foreground">{taxRate}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
