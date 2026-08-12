import React, { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/formatters";
import { Eye, Edit, Check, X, Ban } from "lucide-react";
import type { Leave } from "../types/leaves.types";

interface LeaveTableProps {
  leaves: Leave[];
  onView: (leave: Leave) => void;
  onEdit: (leave: Leave) => void;
  onApprove: (leave: Leave) => void;
  onReject: (leave: Leave) => void;
  onCancel: (leave: Leave) => void;
  isLoading: boolean;
}

export default function LeaveTable({
  leaves,
  onView,
  onEdit,
  onApprove,
  onReject,
  onCancel,
  isLoading,
}: LeaveTableProps) {
  const { user } = useAuth();
  const canManage = hasPermission(user, "employees.leaves.manage");

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "destructive";
      case "cancelled":
        return "muted";
      case "pending":
      default:
        return "warning";
    }
  };

  const columns = useMemo<ColumnDef<Leave>[]>(
    () => [
      {
        accessorKey: "leaveCode",
        header: "Leave Code",
        cell: (info) => <span className="font-mono font-bold text-foreground">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "staffId",
        header: "Staff Member",
        cell: (info) => {
          const leave = info.row.original;
          const staffName =
            typeof leave.staffId === "object"
              ? leave.staffId.name
              : "Self Service";
          return <span className="font-semibold text-foreground">{staffName}</span>;
        },
      },
      {
        accessorKey: "leaveType",
        header: "Leave Type",
        cell: (info) => (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-semibold">
            {info.getValue() as string}
          </Badge>
        ),
      },
      {
        accessorKey: "startDate",
        header: "Start Date",
        cell: (info) => (
          <span suppressHydrationWarning className="font-medium text-foreground">
            {formatDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: "endDate",
        header: "End Date",
        cell: (info) => (
          <span suppressHydrationWarning className="font-medium text-foreground">
            {formatDate(info.getValue() as string)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue() as string;
          return (
            <Badge variant={getStatusVariant(status)}>
              <span className="capitalize">{status}</span>
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: (info) => {
          const leave = info.row.original;
          const isPending = leave.status === "pending";
          const isApproved = leave.status === "approved";

          return (
            <div className="flex justify-end gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onView(leave)}
                className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                title="View Details"
              >
                <Eye size={14} />
              </Button>

              {isPending && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(leave)}
                  className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Edit Leave"
                >
                  <Edit size={14} />
                </Button>
              )}

              {isPending && canManage && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onApprove(leave)}
                    className="h-8 w-8 cursor-pointer text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                    title="Approve Leave"
                  >
                    <Check size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onReject(leave)}
                    className="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="Reject Leave"
                  >
                    <X size={14} />
                  </Button>
                </>
              )}

              {(isPending || isApproved) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onCancel(leave)}
                  className="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Cancel Leave"
                >
                  <Ban size={14} />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [onView, onEdit, onApprove, onReject, onCancel, canManage]
  );

  const renderMobileRow = (leave: Leave) => {
    const isPending = leave.status === "pending";
    const isApproved = leave.status === "approved";
    const staffName =
      typeof leave.staffId === "object" ? leave.staffId.name : "Self Service";

    return (
      <div key={leave.id} className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-sm text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-foreground">{leave.leaveCode}</span>
              <Badge variant={getStatusVariant(leave.status)}>
                <span className="capitalize">{leave.status}</span>
              </Badge>
            </div>
            <h4 className="font-semibold text-foreground text-sm mt-1">{staffName}</h4>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-semibold mt-1">
              {leave.leaveType}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 cursor-pointer"
              onClick={() => onView(leave)}
              aria-label="View details"
            >
              <Eye size={14} />
            </Button>
            {isPending && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer"
                onClick={() => onEdit(leave)}
                aria-label="Edit leave"
              >
                <Edit size={14} />
              </Button>
            )}
            {isPending && canManage && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 cursor-pointer text-emerald-600"
                  onClick={() => onApprove(leave)}
                  aria-label="Approve leave"
                >
                  <Check size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 cursor-pointer text-destructive"
                  onClick={() => onReject(leave)}
                  aria-label="Reject leave"
                >
                  <X size={14} />
                </Button>
              </>
            )}
            {(isPending || isApproved) && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer text-destructive"
                onClick={() => onCancel(leave)}
                aria-label="Cancel leave"
              >
                <Ban size={14} />
              </Button>
            )}
          </div>
        </div>

        <div className="text-xs space-y-1.5 pt-2.5 border-t border-border/50 text-muted-foreground">
          <div className="flex justify-between">
            <span>Duration:</span>
            <span suppressHydrationWarning className="font-medium text-foreground">
              {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Reason:</span>
            <span className="font-medium text-foreground line-clamp-1">{leave.reason}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      data={leaves}
      isLoading={isLoading}
      renderMobileRow={renderMobileRow}
    />
  );
}
