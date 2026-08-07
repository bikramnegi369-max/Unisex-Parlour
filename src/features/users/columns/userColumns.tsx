import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { UserResponseDTO } from "../types/users.types";
import { Badge } from "@/components/ui/badge";
import { EntityActionMenu } from "@/components/entity/EntityActionMenu";
import { capitalizeWords } from "@/lib/formatters";

interface UserColumnOptions {
  onView: (user: UserResponseDTO) => void;
  onEdit: (user: UserResponseDTO) => void;
  onDeactivate: (user: UserResponseDTO) => void;
  onReactivate: (user: UserResponseDTO) => void;
  onSuspend: (user: UserResponseDTO) => void;
}

export const buildUserColumns = ({
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  onSuspend,
}: UserColumnOptions): ColumnDef<UserResponseDTO>[] => [
  {
    accessorKey: "name",
    header: "Staff Member",
    cell: (info) => {
      const user = info.row.original;
      const formattedName = capitalizeWords(user.name);
      return (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {formattedName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{formattedName}</p>
            {user.hasOrgWideAccess && (
              <span className="inline-flex mt-0.5 items-center px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[9px] font-semibold border border-amber-500/20">
                Org-Wide
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: (info) => {
      const val = info.getValue() as string;
      return (
        <a href={`mailto:${val}`} className="font-medium text-muted-foreground hover:underline">
          {val}
        </a>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: (info) => {
      const val = info.getValue() as string;
      return val ? (
        <a href={`tel:${val}`} className="font-medium text-muted-foreground hover:underline">
          {val}
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: (info) => {
      const role = info.getValue() as any;
      const roleName = typeof role === "object" && role !== null ? role.name : role;
      return (
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10">
          {roleName || "Staff"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (info) => {
      const status = (info.getValue() as string) || "active";
      let badgeVariant: "success" | "destructive" | "muted" | "warning" = "success";
      if (status === "inactive") badgeVariant = "muted";
      if (status === "suspended") badgeVariant = "destructive";
      if (status === "locked") badgeVariant = "warning";

      return (
        <Badge variant={badgeVariant}>
          <span className="capitalize">{status}</span>
        </Badge>
      );
    },
  },
  {
    accessorKey: "branchAccess",
    header: "Branches",
    cell: (info) => {
      const user = info.row.original;
      if (user.hasOrgWideAccess) {
        return <span className="text-xs text-muted-foreground font-medium">All Branches</span>;
      }
      const activeBranches = user.branchAccess.filter((b) => b.isActive);
      if (activeBranches.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {activeBranches.map((b) => (
            <Badge key={b.branchId} variant="outline" className="text-[10px] px-1.5 py-0">
              {b.branchName}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: (info) => {
      const u = info.row.original;
      const isActive = u.status === "active";
      const isLocked = u.status === "locked";

      return (
        <div className="flex justify-end gap-1">
          <EntityActionMenu
            onView={() => onView(u)}
            onEdit={() => onEdit(u)}
            onDelete={isActive ? () => onDeactivate(u) : undefined}
            onReactivate={(!isActive || isLocked) ? () => onReactivate(u) : undefined}
            status={u.status}
            permissions={{
              edit: "users.update",
              delete: "users.update",
            }}
          />
          {isActive && (
            <button
              onClick={() => onSuspend(u)}
              className="px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 rounded border border-transparent transition-all cursor-pointer"
              title="Suspend User"
            >
              Suspend
            </button>
          )}
        </div>
      );
    },
  },
];
