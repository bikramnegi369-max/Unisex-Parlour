"use client";

import React, { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Building2, Eye, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Button } from "@/components/ui/button";
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

  const { branches, organization, isLoading, isError } = useBranches();

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
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(row.original)}
            className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
            title="View Details"
          >
            <Eye size={15} />
          </Button>

          {canUpdate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.original)}
              className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Edit Branch"
            >
              <Edit2 size={15} />
            </Button>
          )}

          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(row.original)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title="Deactivate Branch"
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load branches"
          description="There was an issue retrieving branches from the server."
          retryAction={{
            label: "Retry",
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Branch Management</h1>
            {organization && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                <Building2 size={12} />
                {organization.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Manage physical and logical branch locations across your organization.
          </p>
        </div>

        {canCreate && (
          <Button onClick={handleCreate} className="gap-2 shrink-0">
            <Plus size={16} />
            <span>Add Branch</span>
          </Button>
        )}
      </div>

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
