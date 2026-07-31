"use client";

import type { Service } from "../../types/service.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { ArrowLeft, Edit, Trash2, UserCheck, Calendar } from "lucide-react";

interface ServiceProfileHeaderProps {
  service: Service;
  canEdit: boolean;
  canDelete: boolean;
  categoryName: string;
  onBack: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}

export function ServiceProfileHeader({
  service,
  canEdit,
  canDelete,
  categoryName,
  onBack,
  onEdit,
  onDeactivate,
  onReactivate,
}: ServiceProfileHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Header actions row */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </Button>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Edit size={14} />
              Edit Service
            </Button>
          )}
          {canDelete && service.isActive && (
            <Button
              variant="destructive"
              onClick={onDeactivate}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} />
              Deactivate
            </Button>
          )}
          {canEdit && !service.isActive && (
            <Button
              variant="outline"
              onClick={onReactivate}
              className="flex items-center gap-1.5 cursor-pointer border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-500/20"
            >
              <UserCheck size={14} />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Profile summary card */}
      <div className="p-6 bg-card border border-border/80 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold shrink-0">
            {service.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{service.name}</h2>
              <Badge variant={service.isActive ? "success" : "muted"}>
                {service.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {service.code && (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[9px] py-0 px-1.5 font-semibold">
                  {service.code}
                </Badge>
              )}
              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px] py-0 px-1.5 font-medium">
                {categoryName}
              </Badge>
              {service.taxable && (
                <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 text-[10px] py-0 px-1.5 font-medium dark:text-amber-400">
                  Taxable
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Calendar size={12} />
              Duration: <span className="font-medium text-foreground">{service.duration} minutes</span>
            </p>
          </div>
        </div>

        {/* Price highlight */}
        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base Price</span>
          <p className="text-2xl font-bold text-foreground mt-0.5">
            {formatCurrency(service.pricing?.basePrice ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
