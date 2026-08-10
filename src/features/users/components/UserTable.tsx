"use client";

import React, { useMemo } from "react";
import type { UserResponseDTO } from "../types/users.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { UserMobileCard } from "./UserMobileCard";
import { buildUserColumns } from "../columns/userColumns";
import { USERS_CONFIG } from "../config/users.config";

interface UserTableProps {
  users: UserResponseDTO[];
  onView: (user: UserResponseDTO) => void;
  onEdit: (user: UserResponseDTO) => void;
  onDeactivate: (user: UserResponseDTO) => void;
  onReactivate: (user: UserResponseDTO) => void;
  onSuspend: (user: UserResponseDTO) => void;
  isLoading: boolean;
}

export default function UserTable({
  users,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  onSuspend,
  isLoading,
}: UserTableProps) {
  const { user } = useAuth();

  const canEdit = hasPermission(user, USERS_CONFIG.permissions.edit);
  const canDelete = hasPermission(user, USERS_CONFIG.permissions.delete);

  const columns = useMemo(
    () =>
      buildUserColumns({
        onView,
        onEdit,
        onDeactivate,
        onReactivate,
        onSuspend,
      }),
    [onView, onEdit, onDeactivate, onReactivate, onSuspend],
  );

  const renderMobileRow = (user: UserResponseDTO) => (
    <UserMobileCard
      key={user.id}
      user={user}
      canEdit={canEdit}
      canDelete={canDelete}
      onView={onView}
      onEdit={onEdit}
      onDeactivate={onDeactivate}
      onReactivate={onReactivate}
    />
  );

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
      getRowClassName={(row) =>
        row.status !== "active" ? "opacity-60 bg-muted/50" : ""
      }
    />
  );
}
