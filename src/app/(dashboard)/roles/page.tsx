"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Trash2, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import RolesListHeader from "@/features/roles/components/RolesListHeader";
import CreateRoleDialog from "@/features/roles/components/CreateRoleDialog";
import RoleDeleteDialog from "@/features/roles/components/RoleDeleteDialog";
import RoleMatrixTable from "@/features/roles/components/RoleMatrixTable";
import PermissionGate from "@/components/layout/PermissionGate";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

import {
  useRoles,
  usePermissions,
  usePermissionModules,
  useUpdateRolePermissions,
} from "@/features/roles/hooks/useRoles";
import type { Role } from "@/features/roles/types/roles.types";

export default function RolesPage() {
  const { data: roles = [], isLoading: isLoadingRoles, isError: isErrorRoles, refetch: refetchRoles } = useRoles();
  const { data: serverModules = [], isLoading: isLoadingModules } = usePermissionModules();

  // Pagination & Filtering State for Permissions
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");

  const {
    data: permissionsResult,
    isLoading: isLoadingPermissions,
  } = usePermissions({
    page: currentPage,
    limit: pageSize,
    search: searchQuery || undefined,
    module: selectedModule !== "all" ? selectedModule : undefined,
  });

  const { mutate: updatePermissions, isPending: isSavingPermissions } = useUpdateRolePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Reset to page 1 when search or module filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedModule]);

  // Default selection to first role when data loads
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0] || null;

  const permissionsList = permissionsResult?.data || [];
  const permissionsMeta = permissionsResult?.meta;

  const handleSavePermissions = (updatedPermissions: string[]) => {
    if (!selectedRole) return;
    updatePermissions({
      id: selectedRole.id,
      payload: { permissions: updatedPermissions },
    });
  };

  const handleDeleteClick = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleToDelete(role);
    setIsDeleteOpen(true);
  };

  const handleAfterDelete = () => {
    setRoleToDelete(null);
    if (roles.length > 1) {
      const remaining = roles.filter((r) => r.id !== roleToDelete?.id);
      if (remaining.length > 0) {
        setSelectedRoleId(remaining[0].id);
      }
    } else {
      setSelectedRoleId(null);
    }
  };

  if (isLoadingRoles) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  if (isErrorRoles) {
    return (
      <ErrorState
        title="Failed to Load Roles"
        description="An error occurred while fetching role permissions configuration."
        retryAction={{
          label: "Try Again",
          onClick: () => refetchRoles(),
        }}
      />
    );
  }

  if (roles.length === 0) {
    return (
      <div className="space-y-6 w-full max-w-full overflow-hidden">
        <RolesListHeader onCreateRoleClick={() => setIsCreateOpen(true)} />

        <Card className="border border-border/80 shadow-sm p-8 sm:p-12 text-center bg-card">
          <EmptyState
            icon={ShieldAlert}
            title="No Roles Configured"
            description="Your organization has no active security roles. Create your first custom role to manage staff authorization and capability bounds."
            action={{
              label: "Create Custom Role",
              onClick: () => setIsCreateOpen(true),
              icon: Plus,
            }}
          />
        </Card>

        {/* Create Custom Role Dialog */}
        <CreateRoleDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <RolesListHeader onCreateRoleClick={() => setIsCreateOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        {/* Left Side: Roles List Navigation */}
        <div className="lg:col-span-3 space-y-2 w-full min-w-0">
          {roles.map((role) => {
            const isSelected = selectedRole?.id === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-between border group",
                  isSelected
                    ? "bg-primary/5 text-primary border-primary/20 shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                  <span className="truncate">{role.name}</span>
                </div>

                {!role.isSystem && (
                  <PermissionGate permission="roles.delete">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(role, e)}
                      title="Delete Role"
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </PermissionGate>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Matrix Configurations */}
        <div className="lg:col-span-9 w-full min-w-0">
          <RoleMatrixTable
            selectedRole={selectedRole}
            allPermissions={permissionsList}
            dynamicModules={serverModules}
            meta={permissionsMeta}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(limit) => {
              setPageSize(limit);
              setCurrentPage(1);
            }}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            selectedModule={selectedModule}
            onModuleChange={(m) => setSelectedModule(m)}
            onSavePermissions={handleSavePermissions}
            isSaving={isSavingPermissions}
            isLoadingPermissions={isLoadingPermissions}
            isLoadingModules={isLoadingModules}
          />
        </div>
      </div>

      {/* Create Custom Role Dialog */}
      <CreateRoleDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Delete Role Dialog */}
      <RoleDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setRoleToDelete(null);
        }}
        roleId={roleToDelete?.id || null}
        roleName={roleToDelete?.name || ""}
        onSuccess={handleAfterDelete}
      />
    </div>
  );
}
