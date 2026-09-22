import React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters";
import type { AuditLog } from "../types/auditLog.types";
import { Eye, Clock } from "lucide-react";

interface AuditLogColumnOptions {
  onViewDetails: (log: AuditLog) => void;
  getBranchName: (id?: string) => string;
  isAllBranches: boolean;
}

export const getActionVariant = (
  action: string,
):
  | "default"
  | "secondary"
  | "destructive"
  | "success"
  | "warning"
  | "muted"
  | "outline" => {
  const upper = action.toUpperCase();
  if (
    upper.includes("CREATE") ||
    upper.includes("ADD") ||
    upper.includes("REGISTER")
  ) {
    return "success";
  }
  if (
    upper.includes("DELETE") ||
    upper.includes("CANCEL") ||
    upper.includes("DEACTIVATE") ||
    upper.includes("REJECT")
  ) {
    return "destructive";
  }
  if (
    upper.includes("UPDATE") ||
    upper.includes("EDIT") ||
    upper.includes("MODIFY") ||
    upper.includes("ASSIGN")
  ) {
    return "secondary";
  }
  if (upper.includes("REACTIVATE") || upper.includes("APPROVE")) {
    return "success";
  }
  if (upper.includes("STATUS") || upper.includes("REMINDER")) {
    return "warning";
  }
  return "outline";
};

export const formatActionLabel = (action: string): string => {
  if (!action) return "—";
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const buildAuditLogColumns = ({
  onViewDetails,
  getBranchName,
  isAllBranches,
}: AuditLogColumnOptions): ColumnDef<AuditLog>[] => [
  {
    accessorKey: "createdAt",
    header: "Date & Time",
    cell: (info) => {
      const val = info.getValue() as string;
      return (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex flex-col">
            <span
              suppressHydrationWarning
              className="font-medium text-foreground text-xs whitespace-nowrap"
            >
              {formatDateTime(val)}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "actor",
    header: "Actor",
    cell: (info) => {
      const actor = info.row.original.actor;
      const name = actor?.name || "System";
      const email = actor?.email;

      return (
        <div className="flex items-center gap-2.5 max-w-45">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="truncate">
            <p className="font-semibold text-xs text-foreground truncate">
              {name}
            </p>
            {email && (
              <p className="text-[11px] text-muted-foreground truncate">
                {email}
              </p>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: (info) => {
      const action = info.getValue() as string;
      const variant = getActionVariant(action);
      const label = formatActionLabel(action);

      return (
        <Badge
          variant={variant}
          className="text-[11px] font-medium whitespace-nowrap"
        >
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "entityType",
    header: "Entity",
    cell: (info) => {
      const entity = info.getValue() as string;
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs bg-card border-border/80">
            {entity || "—"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: (info) => {
      const desc = info.getValue() as string;
      return (
        <p
          className="text-xs text-muted-foreground line-clamp-2 max-w-85"
          title={desc}
        >
          {desc || "—"}
        </p>
      );
    },
  },
  ...(isAllBranches
    ? [
        {
          accessorKey: "branchId",
          header: "Branch",
          cell: (info: {
            getValue: () => unknown;
            row: { original: AuditLog };
          }) => {
            const branchId = info.getValue() as string | undefined;
            if (!branchId)
              return <span className="text-muted-foreground text-xs">—</span>;
            return (
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/10 text-xs"
              >
                {getBranchName(branchId)}
              </Badge>
            );
          },
        },
      ]
    : []),
  {
    id: "actions",
    header: () => <div className="text-right">Details</div>,
    cell: (info) => {
      const log = info.row.original;
      return (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onViewDetails(log)}
            className="cursor-pointer h-8 w-8 rounded-lg hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors text-muted-foreground"
            title="View Full Audit Log Details"
            aria-label="View Full Audit Log Details"
          >
            <Eye size={15} />
          </button>
        </div>
      );
    },
  },
];
