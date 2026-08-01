"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Plus, FolderKanban } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SERVICES_CONFIG } from "../../config/services.config";

interface ServicesListHeaderProps {
  isAllBranchesSelected: boolean;
  canCreate: boolean;
  onAddClick: () => void;
  viewMode: "services" | "categories";
}

export function ServicesListHeader({
  isAllBranchesSelected,
  canCreate,
  onAddClick,
  viewMode,
}: ServicesListHeaderProps) {
  const isServices = viewMode === "services";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {isServices ? "Services Directory" : "Service Categories"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isServices
            ? "Configure service catalogs, treatment durations, pricing structures, and category hierarchies."
            : "Manage categories used to group and organize parlour services."}
        </p>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <Link
          href={
            isServices
              ? SERVICES_CONFIG.routes.categories.list
              : SERVICES_CONFIG.routes.services.list
          }
          className={cn(
            buttonVariants({ variant: "outline" }),
            "flex items-center gap-1.5 cursor-pointer"
          )}
        >
          <FolderKanban size={16} />
          {isServices ? "Manage Categories" : "Back to Services"}
        </Link>

        {isAllBranchesSelected ? (
          <div className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            <span>Select branch to configure catalogue</span>
          </div>
        ) : (
          canCreate && (
            <div className="flex items-center gap-2">
              <Button
                onClick={onAddClick}
                className="flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer"
              >
                <Plus size={16} />
                {isServices ? "Add Service" : "Add Category"}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
