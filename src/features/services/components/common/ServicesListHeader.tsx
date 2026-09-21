import React from "react";
import Link from "next/link";
import { Plus, FolderKanban, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SERVICES_CONFIG } from "../../config/services.config";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";

interface ServicesListHeaderProps {
  canCreate: boolean;
  onAddClick: () => void;
  viewMode: "services" | "categories";
  isSyncing: boolean;
  onSync: () => void;
}

export function ServicesListHeader({
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
          "flex items-center justify-center gap-1.5 cursor-pointer h-8 w-full sm:w-auto",
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

      {canCreate && (
        <Button
          onClick={onAddClick}
          className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
        >
          <Plus size={16} />
          {isServices ? "Add Service" : "Add Category"}
        </Button>
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
