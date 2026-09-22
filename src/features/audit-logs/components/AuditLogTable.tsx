"use client";

import React, { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/formatters";
import {
  buildAuditLogColumns,
  getActionVariant,
  formatActionLabel,
} from "../columns/auditLogColumns";
import type { AuditLog } from "../types/auditLog.types";
import { Eye, Clock, User } from "lucide-react";

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
  emptyState?: React.ReactNode;
  onViewDetails: (log: AuditLog) => void;
  getBranchName: (id?: string) => string;
  isAllBranches: boolean;
}

export function AuditLogTable({
  logs,
  isLoading,
  emptyState,
  onViewDetails,
  getBranchName,
  isAllBranches,
}: AuditLogTableProps) {
  const columns = useMemo(
    () =>
      buildAuditLogColumns({
        onViewDetails,
        getBranchName,
        isAllBranches,
      }),
    [onViewDetails, getBranchName, isAllBranches],
  );

  const renderMobileRow = (log: AuditLog) => {
    const actorName = log.actor?.name || "System";
    const actionLabel = formatActionLabel(log.action);
    const actionVariant = getActionVariant(log.action);

    return (
      <div
        key={log.id}
        className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-xs text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={actionVariant} className="text-xs">
                {actionLabel}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {log.entityType}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDateTime(log.createdAt)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onViewDetails(log)}
            className="cursor-pointer h-8 w-8 rounded-lg hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors text-muted-foreground shrink-0"
            title="View Details"
            aria-label="View Details"
          >
            <Eye size={15} />
          </button>
        </div>

        <p className="text-xs text-foreground leading-relaxed">
          {log.description || "No description."}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-foreground">{actorName}</span>
          </div>

          {isAllBranches && log.branchId && (
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/5 text-primary border-primary/10"
            >
              {getBranchName(log.branchId)}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      data={logs}
      isLoading={isLoading}
      emptyState={emptyState}
      renderMobileRow={renderMobileRow}
    />
  );
}
