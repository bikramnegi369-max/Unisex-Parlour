"use client";

import React from "react";
import type { ServiceCategory } from "../../types/category.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, UserCheck } from "lucide-react";
import { capitalizeWords } from "@/lib/formatters";

interface ServiceCategoryMobileCardProps {
  category: ServiceCategory;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (category: ServiceCategory) => void;
  onDelete: (category: ServiceCategory) => void;
  onReactivate: (category: ServiceCategory) => void;
  isAllBranches?: boolean;
  getBranchName?: (branchId: string) => string;
}

export function ServiceCategoryMobileCard({
  category,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onReactivate,
  isAllBranches,
  getBranchName,
}: ServiceCategoryMobileCardProps) {
  const formattedName = capitalizeWords(category.name);
  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm text-left">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {formattedName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-semibold text-foreground text-sm">{formattedName}</h4>
              <Badge variant={category.isActive ? "success" : "muted"}>
                {category.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {category.description && (
              <p className="text-xs text-muted-foreground mt-1 max-w-xs line-clamp-2">
                {category.description}
              </p>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <Button
              variant="outline"
              className="h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(category);
              }}
              aria-label={`Edit ${formattedName}`}
            >
              <Edit size={15} />
            </Button>
          )}
          {canDelete && category.isActive && (
            <Button
              variant="destructive"
              className="h-10 w-10 bg-destructive/10 text-destructive border-transparent flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category);
              }}
              aria-label={`Deactivate ${formattedName}`}
            >
              <Trash2 size={15} />
            </Button>
          )}
          {canEdit && !category.isActive && (
            <Button
              variant="outline"
              className="h-10 w-10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-500/20 flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(category);
              }}
              aria-label={`Reactivate ${formattedName}`}
            >
              <UserCheck size={15} />
            </Button>
          )}
        </div>
      </div>
      <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
        <div className="flex justify-between">
          <span>Display Order:</span>
          <span className="font-semibold text-foreground">{category.displayOrder}</span>
        </div>
        {isAllBranches && getBranchName && (
          <div className="flex justify-between">
            <span>Branch:</span>
            <span className="font-semibold text-foreground">{getBranchName(category.branchId)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
