"use client";

import React from "react";
import { AlertTriangle, Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServicesListHeaderProps {
  isAllBranchesSelected: boolean;
  canCreate: boolean;
  onAddServiceClick: () => void;
  onAddCategoryClick: () => void;
  onToggleViewMode: () => void;
  viewMode: "services" | "categories";
}

export function ServicesListHeader({
  isAllBranchesSelected,
  canCreate,
  onAddServiceClick,
  onAddCategoryClick,
  onToggleViewMode,
  viewMode,
}: ServicesListHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Services Directory</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure service catalogs, treatment durations, pricing structures, and category hierarchies.
        </p>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <Button
          variant="outline"
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <FolderKanban size={16} />
          {viewMode === "services" ? "Manage Categories" : "Back to Services"}
        </Button>

        {isAllBranchesSelected ? (
          <div className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Select branch to configure catalogue</span>
          </div>
        ) : (
          canCreate && (
            <div className="flex items-center gap-2">
              {viewMode === "services" ? (
                <Button
                  onClick={onAddServiceClick}
                  className="flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
                >
                  <Plus size={16} />
                  Add Service
                </Button>
              ) : (
                <Button
                  onClick={onAddCategoryClick}
                  className="flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
                >
                  <Plus size={16} />
                  Add Category
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
