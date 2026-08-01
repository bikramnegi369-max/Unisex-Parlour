import React from "react";
import Link from "next/link";
import { AlertTriangle, Plus, FolderKanban, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SERVICES_CONFIG } from "../../config/services.config";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface ServicesListHeaderProps {
  isAllBranchesSelected: boolean;
  canCreate: boolean;
  onAddClick: () => void;
  viewMode: "services" | "categories";
  isSyncing: boolean;
  onSync: () => void;
}

export function ServicesListHeader({
  isAllBranchesSelected,
  canCreate,
  onAddClick,
  viewMode,
  isSyncing,
  onSync,
}: ServicesListHeaderProps) {
  const isServices = viewMode === "services";
  const bannerTitle = isServices ? "Services Directory" : "Service Categories";
  const bannerDescription = isServices
    ? "Configure service catalogs, treatment durations, pricing structures, and category hierarchies."
    : "Manage categories used to group and organize parlour services.";
  const bannerIcon = isServices ? Sparkles : FolderKanban;

  const actions = (
    <>
      <Link
        href={
          isServices
            ? SERVICES_CONFIG.routes.categories.list
            : SERVICES_CONFIG.routes.services.list
        }
        className={cn(
          buttonVariants({ variant: "outline" }),
          "flex items-center justify-center gap-1.5 cursor-pointer h-8 w-full sm:w-auto"
        )}
      >
        {isServices ? <FolderKanban size={16} /> : <Sparkles size={16} />}
        {isServices ? "Manage Categories" : "Back to Services"}
      </Link>

      <SyncButton
        isSyncing={isSyncing}
        onSync={onSync}
        label={isServices ? "Refresh Services" : "Refresh Categories"}
        className="w-full sm:w-auto"
      />

      {isAllBranchesSelected ? (
        <div className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center justify-center gap-1.5 h-8 w-full sm:w-auto">
          <AlertTriangle size={14} />
          <span>Select branch to configure catalogue</span>
        </div>
      ) : (
        canCreate && (
          <Button
            onClick={onAddClick}
            className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
          >
            <Plus size={16} />
            {isServices ? "Add Service" : "Add Category"}
          </Button>
        )
      )}
    </>
  );

  return (
    <PageHeaderBanner
      title={bannerTitle}
      description={bannerDescription}
      icon={bannerIcon}
      actions={actions}
    />
  );
}
