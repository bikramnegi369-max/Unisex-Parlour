"use client";

import type { Service } from "../../types/service.types";
import { Badge } from "@/components/ui/badge";

interface ServiceAuditCardProps {
  service: Service;
  branchName: string;
}

export function ServiceAuditCard({ service, branchName }: ServiceAuditCardProps) {
  const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  };

  return (
    <div className="border border-border/80 rounded-xl bg-card shadow-sm p-6 space-y-6 text-left">
      <div className="border-b border-border/85 pb-4">
        <h3 className="font-semibold text-foreground">Audit Information</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created At</span>
          <p className="text-sm font-semibold text-foreground" suppressHydrationWarning>
            {getFormattedDate(service.createdAt)}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Updated At</span>
          <p className="text-sm font-semibold text-foreground" suppressHydrationWarning>
            {getFormattedDate(service.updatedAt)}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configured Branch Scope</span>
          <div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
              {branchName}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
