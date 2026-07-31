"use client";

import type { Service } from "../../types/service.types";
import { Badge } from "@/components/ui/badge";

interface ServiceOverviewCardProps {
  service: Service;
  categoryName: string;
}

export function ServiceOverviewCard({ service, categoryName }: ServiceOverviewCardProps) {
  return (
    <div className="border border-border/80 rounded-xl bg-card shadow-sm p-6 space-y-6 text-left">
      <div className="border-b border-border/85 pb-4">
        <h3 className="font-semibold text-foreground">Basic Information</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Name</span>
          <p className="text-sm font-semibold text-foreground">{service.name}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Code</span>
          <p className="text-sm font-semibold text-foreground">{service.code || "—"}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</span>
          <div>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
              {categoryName}
            </Badge>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</span>
          <p className="text-sm font-semibold text-foreground">{service.duration} mins</p>
        </div>
        <div className="col-span-1 md:col-span-2 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
          <p className="text-sm text-foreground leading-relaxed">{service.description || "No description provided."}</p>
        </div>
      </div>
    </div>
  );
}
