"use client";

import React, { useState } from "react";
import { Plus, Search, Users, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

// Import hooks & types
import { useUsers } from "@/features/users/hooks/useUsers";
import { useCreateUser } from "@/features/users/hooks/useCreateUser";
import { useUpdateUser } from "@/features/users/hooks/useUpdateUser";
import { useUpdateUserStatus } from "@/features/users/hooks/useUpdateUserStatus";
import { buildUserColumns } from "@/features/users/columns/userColumns";
import type { UserResponseDTO, UpdateUserStatus } from "@/features/users/types/users.types";

// Import custom components
import UserForm from "@/features/users/components/UserForm";
import UserDetailsModal from "@/features/users/components/UserDetailsModal";
import UserStatusDialog from "@/features/users/components/UserStatusDialog";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  
  // Page state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog open state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Selected User tracking
  const [selectedUser, setSelectedUser] = useState<UserResponseDTO | null>(null);
  const [targetStatus, setTargetStatus] = useState<UpdateUserStatus | null>(null);

  // Debounce search input
  React.useEffect(() => {
    if (search === "") {
      setDebouncedSearch("");
      setPage(1);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 600); // Debounce for 600ms
    return () => clearTimeout(handler);
  }, [search]);

  // Query users
  const {
    data: paginatedUsers,
    isLoading,
    isError,
    error,
    refetch,
  } = useUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  // Mutations
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();

  // Permission checks
  const canCreate = hasPermission(currentUser, "users.create");
  const canUpdate = hasPermission(currentUser, "users.update");
  const canView = hasPermission(currentUser, "users.view");

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: UserResponseDTO) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleOpenView = (user: UserResponseDTO) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleOpenStatusConfirm = (user: UserResponseDTO, status: UpdateUserStatus) => {
    setSelectedUser(user);
    setTargetStatus(status);
    setIsStatusOpen(true);
  };

  const handleFormSubmit = async (payload: any) => {
    try {
      if (selectedUser) {
        await updateUserMutation.mutateAsync({
          id: selectedUser.id,
          payload,
        });
      } else {
        await createUserMutation.mutateAsync(payload);
      }
      setIsFormOpen(false);
    } catch {
      // Handled by query mutation error states
    }
  };

  const handleStatusConfirm = async () => {
    if (!selectedUser || !targetStatus) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: selectedUser.id,
        status: targetStatus,
      });
      setIsStatusOpen(false);
    } catch {
      // Error is caught by mutation
    }
  };

  const columns = buildUserColumns({
    onView: handleOpenView,
    onEdit: handleOpenEdit,
    onDeactivate: (u) => handleOpenStatusConfirm(u, "inactive"),
    onReactivate: (u) => handleOpenStatusConfirm(u, "active"),
    onSuspend: (u) => handleOpenStatusConfirm(u, "suspended"),
  });

  const usersList = paginatedUsers?.data ?? [];
  const totalItems = paginatedUsers?.meta?.total ?? 0;
  const totalPages = paginatedUsers?.meta?.totalPages ?? 1;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-bold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You do not have the required `users.view` permission to view the staff directory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage system users, credentials, roles, and status.
          </p>
        </div>
        {canCreate && (
          <Button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10 rounded-lg cursor-pointer font-semibold text-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Directory Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="p-6 border-b border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Staff Members
          </CardTitle>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <Input
              type="text"
              placeholder="Search by name or email..."
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset page on type
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <h3 className="text-sm font-bold text-foreground">Failed to load staff list</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {error instanceof Error ? error.message : "An unexpected API error occurred."}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry Load
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <DataTable
                columns={columns}
                data={usersList}
                isLoading={isLoading}
                emptyState={
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No staff members match your criteria.
                  </div>
                }
              />

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={(p) => setPage(p)}
                itemLabel="staff members"
                pageSize={limit}
                onPageSizeChange={(l) => {
                  setLimit(l);
                  setPage(1);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedUser ? "Edit Staff Details" : "Register New Staff Member"}
      >
        <UserForm
          initialUser={selectedUser || undefined}
          onSubmit={handleFormSubmit}
          isSubmitting={createUserMutation.isPending || updateUserMutation.isPending}
          onCancel={() => setIsFormOpen(false)}
        />
      </Dialog>

      {/* Details Dialog */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      {/* Status Transition Confirmation Dialog */}
      <UserStatusDialog
        user={selectedUser}
        targetStatus={targetStatus}
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        onConfirm={handleStatusConfirm}
        isSubmitting={updateStatusMutation.isPending}
      />
    </div>
  );
}
