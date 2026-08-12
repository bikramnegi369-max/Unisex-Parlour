"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  useLeaves,
  useCreateLeave,
  useUpdateLeave,
  useApproveLeave,
  useRejectLeave,
  useCancelLeave,
} from "../hooks/useLeaves";
import LeaveTable from "./LeaveTable";
import LeaveFilters from "./LeaveFilters";
import LeaveForm from "./LeaveForm";
import {
  ApproveLeaveDialog,
  RejectLeaveDialog,
  CancelLeaveDialog,
} from "./LeaveActionDialogs";
import { LeaveListHeader } from "./LeaveListHeader";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Plus, CalendarOff, AlertTriangle } from "lucide-react";
import type { Leave, CreateLeavePayload, UpdateLeavePayload } from "../types/leaves.types";

export default function LeaveList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { isAllBranchesSelected } = useBranchContext();

  const canCreate = hasPermission(user, "employees.leaves.view");

  // Read URL query params
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  const searchQueryParam = searchParams.get("search") || "";
  const statusParam = searchParams.get("status") || "all";
  const staffIdParam = searchParams.get("staffId") || "";
  const startDateParam = searchParams.get("startDate") || "";
  const endDateParam = searchParams.get("endDate") || "";

  // Local state for search/inputs
  const [search, setSearch] = useState(searchQueryParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQueryParam);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQueryParam);

  // Sync state during render when URL query changes
  if (searchQueryParam !== prevSearchQuery) {
    setPrevSearchQuery(searchQueryParam);
    setSearch(searchQueryParam);
    setDebouncedSearch(searchQueryParam);
  }

  // Modals / dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeLeave, setActiveLeave] = useState<Leave | null>(null);

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [actionLeave, setActionLeave] = useState<Leave | null>(null);

  // Mutations
  const createMutation = useCreateLeave();
  const updateMutation = useUpdateLeave();
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const cancelMutation = useCancelLeave();

  // Leaves query
  const queryParams = {
    page,
    limit,
    search: debouncedSearch,
    status: statusParam === "all" ? undefined : statusParam,
    staffId: staffIdParam || undefined,
    startDate: startDateParam || undefined,
    endDate: endDateParam || undefined,
  };

  const { data, isLoading, error, refetch } = useLeaves(queryParams);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 600);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync search with URL
  useEffect(() => {
    const currentQuery = searchParams.get("search") || "";
    if (debouncedSearch !== currentQuery) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearch, router, pathname, searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    if (searchQueryParam) {
      params.set("search", searchQueryParam);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // Action callbacks
  const handleView = useCallback(
    (leave: Leave) => {
      router.push(`/leaves/${leave.id}`);
    },
    [router]
  );

  const handleEdit = useCallback((leave: Leave) => {
    setActiveLeave(leave);
    setIsEditOpen(true);
  }, []);

  const handleApproveTrigger = useCallback((leave: Leave) => {
    setActionLeave(leave);
    setIsApproveOpen(true);
  }, []);

  const handleRejectTrigger = useCallback((leave: Leave) => {
    setActionLeave(leave);
    setIsRejectOpen(true);
  }, []);

  const handleCancelTrigger = useCallback((leave: Leave) => {
    setActionLeave(leave);
    setIsCancelOpen(true);
  }, []);

  // Form submits
  const handleCreateSubmit = (payload: CreateLeavePayload | UpdateLeavePayload) => {
    createMutation.mutate(payload as CreateLeavePayload, {
      onSuccess: () => {
        toast.success("Leave request submitted successfully.");
        setIsCreateOpen(false);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to submit leave request.";
        toast.error(msg);
      },
    });
  };

  const handleEditSubmit = (payload: CreateLeavePayload | UpdateLeavePayload) => {
    if (!activeLeave) return;
    updateMutation.mutate(
      { id: activeLeave.id, payload: payload as UpdateLeavePayload },
      {
        onSuccess: () => {
          toast.success("Leave request updated successfully.");
          setIsEditOpen(false);
          setActiveLeave(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to update leave request.";
          toast.error(msg);
        },
      }
    );
  };

  // Lifecycle actions submits
  const handleApproveConfirm = (reviewNote: string) => {
    if (!actionLeave) return;
    approveMutation.mutate(
      { id: actionLeave.id, reviewNote: reviewNote || undefined },
      {
        onSuccess: () => {
          toast.success("Leave request approved successfully.");
          setIsApproveOpen(false);
          setActionLeave(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to approve leave request.";
          toast.error(msg);
        },
      }
    );
  };

  const handleRejectConfirm = (reviewNote: string) => {
    if (!actionLeave) return;
    rejectMutation.mutate(
      { id: actionLeave.id, reviewNote },
      {
        onSuccess: () => {
          toast.success("Leave request rejected successfully.");
          setIsRejectOpen(false);
          setActionLeave(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to reject leave request.";
          toast.error(msg);
        },
      }
    );
  };

  const handleCancelConfirm = (cancelReason: string) => {
    if (!actionLeave) return;
    cancelMutation.mutate(
      { id: actionLeave.id, cancelReason },
      {
        onSuccess: () => {
          toast.success("Leave request cancelled successfully.");
          setIsCancelOpen(false);
          setActionLeave(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to cancel leave request.";
          toast.error(msg);
        },
      }
    );
  };

  // Scope gating
  if (isAllBranchesSelected && !user?.hasOrgWideAccess) {
    return (
      <div className="space-y-6">
        <LeaveListHeader
          isAllBranchesSelected={isAllBranchesSelected}
          canCreate={false}
          onAddClick={() => {}}
          isSyncing={false}
          onSync={() => {}}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-card/20 p-8 max-w-md mx-auto">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-sm font-semibold text-foreground">Select a Specific Branch</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
            Please select a specific branch from the header location switcher to view and manage leave schedules.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LeaveListHeader
        isAllBranchesSelected={isAllBranchesSelected}
        canCreate={canCreate}
        onAddClick={() => setIsCreateOpen(true)}
        isSyncing={isLoading}
        onSync={refetch}
      />

      <LeaveFilters
        search={search}
        onSearchChange={setSearch}
        status={statusParam}
        onStatusChange={(val) => updateParam("status", val)}
        staffId={staffIdParam}
        onStaffIdChange={(val) => updateParam("staffId", val)}
        startDate={startDateParam}
        onStartDateChange={(val) => updateParam("startDate", val)}
        endDate={endDateParam}
        onEndDateChange={(val) => updateParam("endDate", val)}
        onClear={handleClearFilters}
      />

      {error ? (
        <ErrorState
          description="An error occurred while fetching leaves data. Please try again."
          retryAction={{ label: "Retry", onClick: () => refetch() }}
        />
      ) : data?.data && data.data.length === 0 ? (
        <EmptyState
          title="No Leave Records Found"
          description="Create a new leave request or adjust filters to see records."
          icon={CalendarOff}
          action={
            canCreate
              ? {
                  label: "Apply for Leave",
                  onClick: () => setIsCreateOpen(true),
                  icon: Plus,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <LeaveTable
            leaves={data?.data || []}
            onView={handleView}
            onEdit={handleEdit}
            onApprove={handleApproveTrigger}
            onReject={handleRejectTrigger}
            onCancel={handleCancelTrigger}
            isLoading={isLoading}
          />
          {data?.meta && (
            <Pagination
              currentPage={page}
              totalPages={data.meta.totalPages}
              totalItems={data.meta.total}
              pageSize={limit}
              onPageChange={(p) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(p));
                router.push(`${pathname}?${params.toString()}`);
              }}
              onPageSizeChange={(sz) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("limit", String(sz));
                params.set("page", "1");
                router.push(`${pathname}?${params.toString()}`);
              }}
            />
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Apply for Leave">
        <LeaveForm
          onSubmit={handleCreateSubmit}
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreateOpen(false)}
          submitLabel="Submit Leave Request"
          error={createMutation.error}
        />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog isOpen={isEditOpen} onClose={() => {
        setIsEditOpen(false);
        setActiveLeave(null);
      }} title="Edit Leave Request">
        {activeLeave && (
          <LeaveForm
            initialLeave={activeLeave}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
            onCancel={() => {
              setIsEditOpen(false);
              setActiveLeave(null);
            }}
            submitLabel="Save Changes"
            error={updateMutation.error}
          />
        )}
      </Dialog>

      {/* Approve Dialog */}
      {actionLeave && (
        <ApproveLeaveDialog
          isOpen={isApproveOpen}
          onClose={() => {
            setIsApproveOpen(false);
            setActionLeave(null);
          }}
          onConfirm={handleApproveConfirm}
          isSubmitting={approveMutation.isPending}
          leaveCode={actionLeave.leaveCode}
        />
      )}

      {/* Reject Dialog */}
      {actionLeave && (
        <RejectLeaveDialog
          isOpen={isRejectOpen}
          onClose={() => {
            setIsRejectOpen(false);
            setActionLeave(null);
          }}
          onConfirm={handleRejectConfirm}
          isSubmitting={rejectMutation.isPending}
          leaveCode={actionLeave.leaveCode}
        />
      )}

      {/* Cancel Dialog */}
      {actionLeave && (
        <CancelLeaveDialog
          isOpen={isCancelOpen}
          onClose={() => {
            setIsCancelOpen(false);
            setActionLeave(null);
          }}
          onConfirm={handleCancelConfirm}
          isSubmitting={cancelMutation.isPending}
          leaveCode={actionLeave.leaveCode}
        />
      )}
    </div>
  );
}
