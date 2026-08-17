"use client";

import React, { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Building2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BranchStatusBadge } from "./BranchStatusBadge";
import { BranchFormModal } from "./BranchFormModal";
import { BranchDeactivateDialog } from "./BranchDeactivateDialog";
import { BranchDetailsModal } from "./BranchDetailsModal";
import type { Branch } from "@/types/branch";

export function BranchList() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "branches.create");
  const canUpdate = hasPermission(user, "branches.update");
  const canDelete = hasPermission(user, "branches.delete");

  const { branches, organization, isLoading, isError, refetch, isRefetching } = useBranches();

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const handleCreate = () => {
    setSelectedBranch(null);
    setIsFormOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsFormOpen(true);
  };

  const handleDeactivate = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDeactivateOpen(true);
  };

  const handleViewDetails = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDetailsOpen(true);
  };

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: "name",
      header: "Branch Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Building2 size={16} />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm block">{row.original.name}</span>
            <span className="text-[11px] text-muted-foreground">ID: {row.original.id}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="text-xs text-foreground">
          {row.original.phone || <span className="text-muted-foreground/60">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <span className="text-xs text-foreground max-w-xs truncate block">
          {row.original.address || <span className="text-muted-foreground/60">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <BranchStatusBadge isActive={row.original.isActive} />,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <EntityActionMenu
          onView={() => handleViewDetails(row.original)}
          onEdit={canUpdate ? () => handleEdit(row.original) : undefined}
          onDelete={canDelete ? () => handleDeactivate(row.original) : undefined}
          status={row.original.isActive ? "active" : "inactive"}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <ErrorState
        title="Failed to load branches"
        description="There was an issue retrieving branches from the server."
        retryAction={{
          label: "Try Reconnecting",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  const headerActions = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
      {canCreate && (
        <Button
          onClick={handleCreate}
          className="flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer h-8 w-full sm:w-auto"
        >
          <Plus size={16} />
          <span>Add Branch</span>
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Banner / Header */}
      <PageHeaderBanner
        title="Branch Management"
        description="Manage physical and logical branch locations across your organization."
        icon={Building2}
        actions={headerActions}
      />

      {/* Main Table / Content */}
      <DataTable
        columns={columns}
        data={branches}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Building2}
            title="No active branches found"
            description={
              canCreate
                ? "Get started by creating your first branch for this organization."
                : "No branches are currently available."
            }
            action={
              canCreate
                ? {
                    label: "Add Branch",
                    onClick: handleCreate,
                    icon: Plus,
                  }
                : undefined
            }
          />
        }
      />

      {/* Modals */}
      <BranchFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        branchToEdit={selectedBranch}
      />

      <BranchDeactivateDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        branch={selectedBranch}
      />

      <BranchDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        branch={selectedBranch}
      />
    </div>
  );
}

