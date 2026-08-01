"use client";

import React from "react";
import type { Service } from "../../types/service.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, capitalizeWords } from "@/lib/formatters";
import { Eye, Edit, Trash2, UserCheck } from "lucide-react";

interface ServiceMobileCardProps {
  service: Service;
  canEdit: boolean;
  canDelete: boolean;
  onView: (service: Service) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onReactivate: (service: Service) => void;
  categoryName: string;
  isAllBranches?: boolean;
  getBranchName?: (branchId: string) => string;
}

export function ServiceMobileCard({
  service,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  onReactivate,
  categoryName,
  isAllBranches,
  getBranchName,
}: ServiceMobileCardProps) {
  const formattedName = capitalizeWords(service.name);
  const formattedCategoryName = capitalizeWords(categoryName);
  
  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {formattedName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground text-sm">{formattedName}</h4>
              <Badge variant={service.isActive ? "success" : "muted"}>
                {service.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {service.code && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                {service.code}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Actions with touch targets */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            className="h-10 w-10 flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onView(service);
            }}
            aria-label={`View details of ${formattedName}`}
          >
            <Eye size={15} />
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              className="h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(service);
              }}
              aria-label={`Edit details of ${formattedName}`}
            >
              <Edit size={15} />
            </Button>
          )}
          {canDelete && service.isActive && (
            <Button
              variant="destructive"
              className="h-10 w-10 bg-destructive/10 text-destructive border-transparent flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(service);
              }}
              aria-label={`Deactivate details of ${formattedName}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
          {canEdit && !service.isActive && (
            <Button
              variant="outline"
              className="h-10 w-10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-500/20 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(service);
              }}
              aria-label={`Reactivate details of ${formattedName}`}
            >
              <UserCheck size={15} />
            </Button>
          )}
        </div>
      </div>

      <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
        <div className="flex justify-between">
          <span>Category:</span>
          <span className="font-semibold text-foreground">{formattedCategoryName}</span>
        </div>
        <div className="flex justify-between">
          <span>Duration:</span>
          <span className="font-semibold text-foreground">{service.duration} mins</span>
        </div>
        <div className="flex justify-between">
          <span>Base Price:</span>
          <span className="font-semibold text-foreground">{formatCurrency(service.pricing?.basePrice ?? 0)}</span>
        </div>
        {isAllBranches && getBranchName && (
          <div className="flex justify-between">
            <span>Branch:</span>
            <span className="font-semibold text-foreground">{getBranchName(service.branchId)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
