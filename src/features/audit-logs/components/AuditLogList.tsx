"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { AuditLogTable } from "./AuditLogTable";
import { AuditLogFilters } from "./AuditLogFilters";
import { AuditLogDetailsDialog } from "./AuditLogDetailsDialog";
import type { AuditLog, GetAuditLogsParams } from "../types/auditLog.types";
import { ClipboardList, RefreshCw, History } from "lucide-react";

export function AuditLogList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { isAllBranchesSelected, getBranchName, currentBranchId } =
    useBranchContext();

  // Read URL query parameters
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  const entityTypeParam = searchParams.get("entityType") || "all";
  const actionUrlParam = searchParams.get("action") || "";
  const actorIdUrlParam = searchParams.get("actorId") || "";
  const branchIdParam = searchParams.get("branchId") || "";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";
  const sortParam = searchParams.get("sort") || "-createdAt";

  // Local state for text inputs — provides instant typing responsiveness
  const [actionInput, setActionInput] = useState(actionUrlParam);
  const [actorIdInput, setActorIdInput] = useState(actorIdUrlParam);

  // Track previous URL values to sync back on browser Back/Forward navigation
  const [prevActionUrl, setPrevActionUrl] = useState(actionUrlParam);
  const [prevActorIdUrl, setPrevActorIdUrl] = useState(actorIdUrlParam);

  // Debounce text inputs to avoid API hit on every keystroke
  const debouncedAction = useDebounce(actionInput, 400);
  const debouncedActorId = useDebounce(actorIdInput, 400);

  // Sync local state back from URL when user navigates with Back/Forward
  if (actionUrlParam !== prevActionUrl) {
    setPrevActionUrl(actionUrlParam);
    setActionInput(actionUrlParam);
  }
  if (actorIdUrlParam !== prevActorIdUrl) {
    setPrevActorIdUrl(actorIdUrlParam);
    setActorIdInput(actorIdUrlParam);
  }

  // Modal detail view state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Helper to update URL search parameters
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | number | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === "" || val === "all") {
          current.delete(key);
        } else {
          current.set(key, String(val));
        }
      });

      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.push(`${pathname}${query}`);
    },
    [router, pathname, searchParams],
  );

  // Filter change handlers
  const handlePageChange = (newPage: number) => {
    updateUrlParams({ page: newPage });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    updateUrlParams({ limit: newPageSize, page: 1 });
  };

  const handleEntityTypeChange = (val: string) => {
    updateUrlParams({ entityType: val, page: 1 });
  };

  const handleActionChange = (val: string) => {
    setActionInput(val);
  };

  const handleActorIdChange = (val: string) => {
    setActorIdInput(val);
  };

  // Sync debounced action value to URL
  useEffect(() => {
    if (debouncedAction !== actionUrlParam) {
      updateUrlParams({ action: debouncedAction, page: 1 });
    }
  }, [debouncedAction]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync debounced actorId value to URL
  useEffect(() => {
    if (debouncedActorId !== actorIdUrlParam) {
      updateUrlParams({ actorId: debouncedActorId, page: 1 });
    }
  }, [debouncedActorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBranchIdChange = (val: string) => {
    updateUrlParams({ branchId: val, page: 1 });
  };

  const handleStartDateChange = (val: string) => {
    updateUrlParams({ startDate: val, page: 1 });
  };

  const handleEndDateChange = (val: string) => {
    updateUrlParams({ endDate: val, page: 1 });
  };

  const handleClearFilters = () => {
    setActionInput("");
    setActorIdInput("");
    router.push(pathname);
  };

  // Determine query parameters for API call
  // branchId fallback logic:
  // If branchIdParam was explicitly selected in filters (and is not 'all'), use it.
  // Otherwise, use active currentBranchId (omitted if 'all' or null for org-wide users).
  const effectiveBranchId =
    branchIdParam && branchIdParam !== "all"
      ? branchIdParam
      : currentBranchId && currentBranchId !== "all"
        ? currentBranchId
        : undefined;

  const queryParams: GetAuditLogsParams = useMemo(
    () => ({
      page,
      limit,
      sort: sortParam,
      branchId: effectiveBranchId,
      entityType: entityTypeParam !== "all" ? entityTypeParam : undefined,
      action: debouncedAction.trim() || undefined,
      actorId: debouncedActorId.trim() || undefined,
      startDate: startDateParam || undefined,
      endDate: endDateParam || undefined,
    }),
    [
      page,
      limit,
      sortParam,
      effectiveBranchId,
      entityTypeParam,
      debouncedAction,
      debouncedActorId,
      startDateParam,
      endDateParam,
    ],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAuditLogs(queryParams);

  const logs = data?.data || [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = (meta?.totalPages ?? Math.ceil(total / limit)) || 1;

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Page Header */}
      <PageHeaderBanner
        title="Audit Logs"
        description="Immutable system-wide activity log tracking customer, appointment, staff, service, and administrative events."
        icon={ClipboardList}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="gap-2 cursor-pointer bg-card/50"
            >
              <RefreshCw
                size={14}
                className={isLoading || isFetching ? "animate-spin" : ""}
              />
              <span>Refresh Logs</span>
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <AuditLogFilters
        entityType={entityTypeParam}
        onEntityTypeChange={handleEntityTypeChange}
        action={actionInput}
        onActionChange={handleActionChange}
        actorId={actorIdInput}
        onActorIdChange={handleActorIdChange}
        branchId={branchIdParam || (currentBranchId ?? "all")}
        onBranchIdChange={handleBranchIdChange}
        startDate={startDateParam}
        onStartDateChange={handleStartDateChange}
        endDate={endDateParam}
        onEndDateChange={handleEndDateChange}
        onClear={handleClearFilters}
      />

      {/* Error State */}
      {isError && (
        <ErrorState
          title="Failed to Load Audit Logs"
          description={
            error instanceof Error
              ? error.message
              : "Unable to retrieve audit logs from server. Please check your connection and try again."
          }
          retryAction={{
            label: "Retry",
            onClick: () => refetch(),
            isLoading: isFetching,
          }}
        />
      )}

      {/* Table & Empty State */}
      {!isError && (
        <div className="space-y-4">
          <AuditLogTable
            logs={logs}
            isLoading={isLoading}
            onViewDetails={(log) => setSelectedLog(log)}
            getBranchName={(id?: string) => (id ? getBranchName(id) : "—")}
            isAllBranches={isAllBranchesSelected}
            emptyState={
              <EmptyState
                icon={History}
                title="No Audit Records Found"
                description={
                  actionUrlParam ||
                  entityTypeParam !== "all" ||
                  actorIdUrlParam ||
                  startDateParam
                    ? "No audit records matched your active filter criteria. Try clearing filters or widening the date range."
                    : "There are no recorded system events for the selected branch or timeframe."
                }
              />
            }
          />

          {/* Pagination */}
          {meta && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              onPageChange={handlePageChange}
              pageSize={limit}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="audit logs"
            />
          )}
        </div>
      )}

      {/* Details Dialog */}
      <AuditLogDetailsDialog
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        auditLog={selectedLog}
        branchName={
          selectedLog?.branchId
            ? getBranchName(selectedLog.branchId)
            : undefined
        }
      />
    </div>
  );
}
export default AuditLogList;
