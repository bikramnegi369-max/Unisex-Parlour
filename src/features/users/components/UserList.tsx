"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useUsers } from "../hooks/useUsers";
import { useCreateUser } from "../hooks/useCreateUser";
import { useUpdateUser } from "../hooks/useUpdateUser";
import { useUpdateUserStatus } from "../hooks/useUpdateUserStatus";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Plus, Sparkles, HelpCircle, AlertCircle } from "lucide-react";
import UserTable from "./UserTable";
import UserForm from "./UserForm";
import UserDetailsModal from "./UserDetailsModal";
import UserStatusDialog from "./UserStatusDialog";
import { UserListHeader } from "./UserListHeader";
import { UserSearch } from "./UserSearch";
import { UserFilters } from "./UserFilters";
import { USERS_CONFIG } from "../config/users.config";
import { getErrorMessage } from "@/lib/api/errors";
import type {
  UserResponseDTO,
  UpdateUserStatus,
  UpdateUserPayload,
  CreateUserPayload,
  UserStatus,
} from "../types/users.types";
import { useDebounce } from "@/hooks/useDebounce";

export default function UserList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { isAllBranchesSelected, currentBranch } = useBranchContext();

  const canView = hasPermission(user, USERS_CONFIG.permissions.view);
  const canCreate = hasPermission(user, USERS_CONFIG.permissions.create);

  // Read page parameter from URL
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Read limit parameter from URL
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? parseInt(limitParam, 10)
    : USERS_CONFIG.defaults.pageSize;

  // Read search parameter from URL
  const searchQueryParam = searchParams.get("search") || "";

  // Read status filter parameter from URL
  const statusParam = searchParams.get("status") || "all";

  // Read sort parameter from URL
  const sort = searchParams.get("sort") || "";

  // Local state for immediate typing responsiveness
  const [search, setSearch] = useState(searchQueryParam);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQueryParam);

  const debouncedSearch = useDebounce(search, 400);

  // Sync state during render when URL query changes (e.g. Back/Forward navigation)
  if (searchQueryParam !== prevSearchQuery) {
    setPrevSearchQuery(searchQueryParam);
    setSearch(searchQueryParam);
  }

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserResponseDTO | null>(null);
  const [targetStatus, setTargetStatus] = useState<UpdateUserStatus | null>(
    null,
  );

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();

  // Sync debounced search with URL
  useEffect(() => {
    const currentQuery = searchParams.get("search") || "";
    if (debouncedSearch !== currentQuery) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      } else {
        params.delete("search");
      }
      params.set("page", "1"); // Reset to page 1 on new search query
      router.push(`${pathname}?${params.toString()}`);
    }
  }, [debouncedSearch, router, pathname, searchParams]);

  const handleStatusChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== "all") {
      params.set("status", val);
    } else {
      params.delete("status");
    }
    params.set("page", "1"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("sort", val);
    } else {
      params.delete("sort");
    }
    params.set("page", "1"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    if (searchQueryParam) {
      params.set("search", searchQueryParam);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Fetch paginated users based on URL query state
  const {
    data: userData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useUsers({
    search: searchQueryParam || undefined,
    page,
    limit,
    status: statusParam !== "all" ? (statusParam as UserStatus) : undefined,
    sort: sort || undefined,
  });

  const handleSync = async () => {
    try {
      await refetch();
      toast.success("User directory synchronized successfully.");
    } catch {
      toast.error("Failed to synchronize user directory.");
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newPageSize.toString());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCreateSubmit = (values: CreateUserPayload) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        toast.success("User account created successfully.");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to create user account.");
      },
    });
  };

  const handleEditSubmit = (values: UpdateUserPayload) => {
    if (!activeUser) return;
    updateMutation.mutate(
      { id: activeUser.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setActiveUser(null);
          toast.success("User details updated successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to update user details.");
        },
      },
    );
  };

  const handleStatusConfirm = () => {
    if (!activeUser || !targetStatus) return;
    updateStatusMutation.mutate(
      { id: activeUser.id, status: targetStatus },
      {
        onSuccess: () => {
          setIsStatusOpen(false);
          setActiveUser(null);
          setTargetStatus(null);
          toast.success(
            targetStatus === "active"
              ? "User account activated successfully."
              : targetStatus === "suspended"
                ? "User account suspended successfully."
                : "User account deactivated successfully.",
          );
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to update user account status.");
        },
      },
    );
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-bold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You do not have the required `users.view` permission to view the user
          directory.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Service Unavailable"
        description={getErrorMessage(
          error,
          "An unexpected error occurred while retrieving user records."
        )}
        retryAction={{
          label: "Try Reconnecting",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  const pagination = userData?.meta;
  const users = userData?.data || [];

  return (
    <div className="space-y-6">
      {/* Directory Page Header */}
      <UserListHeader
        canCreate={canCreate}
        onAddClick={() => setIsCreateOpen(true)}
        isSyncing={isRefetching}
        onSync={handleSync}
      />

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
        <UserSearch
          value={search}
          onChange={setSearch}
          isLoading={isRefetching}
        />

        <UserFilters
          status={statusParam}
          onStatusChange={handleStatusChange}
          sort={sort}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
          activeScopeName={
            isAllBranchesSelected
              ? "All Branches (Consolidated)"
              : currentBranch?.name || ""
          }
          isRefetching={isRefetching}
        />
      </div>

      {/* Loading Skeleton or Data Table */}
      {isLoading ? (
        <UserTable
          users={[]}
          onView={() => {}}
          onEdit={() => {}}
          onDeactivate={() => {}}
          onReactivate={() => {}}
          onSuspend={() => {}}
          isLoading={true}
        />
      ) : users.length === 0 ? (
        searchQueryParam || statusParam !== "all" ? (
          <EmptyState
            icon={HelpCircle}
            title="No matches found"
            description="No user matches your search criteria. Try expanding your query or resetting filters."
            action={{
              label: "Reset Search & Filters",
              onClick: () => {
                setSearch("");
                handleClearFilters();
              },
            }}
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="User Directory Empty"
            description={
              isAllBranchesSelected
                ? "No user accounts have been created yet in the organization."
                : `No user records belong to ${currentBranch?.name} yet.`
            }
            action={
              canCreate
                ? {
                    label: "Register First User",
                    onClick: () => setIsCreateOpen(true),
                    icon: Plus,
                  }
                : undefined
            }
          />
        )
      ) : (
        /* Data table view */
        <div className="space-y-4">
          <UserTable
            users={users}
            onView={(u) => {
              setActiveUser(u);
              setIsDetailsOpen(true);
            }}
            onEdit={(u) => {
              setActiveUser(u);
              setIsEditOpen(true);
            }}
            onDeactivate={(u) => {
              setActiveUser(u);
              setTargetStatus("inactive");
              setIsStatusOpen(true);
            }}
            onReactivate={(u) => {
              setActiveUser(u);
              setTargetStatus("active");
              setIsStatusOpen(true);
            }}
            onSuspend={(u) => {
              setActiveUser(u);
              setTargetStatus("suspended");
              setIsStatusOpen(true);
            }}
            isLoading={isRefetching}
          />

          {/* Pagination Controls */}
          {pagination && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              onPageChange={handlePageChange}
              pageSize={limit}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="users"
            />
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register New User"
      >
        <UserForm
          onSubmit={handleCreateSubmit}
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreateOpen(false)}
        />
      </Dialog>

      {/* Edit Dialog */}
      {isEditOpen && activeUser && (
        <Dialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit User Details"
        >
          <UserForm
            initialUser={activeUser}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
            onCancel={() => {
              setIsEditOpen(false);
              setActiveUser(null);
            }}
          />
        </Dialog>
      )}

      {/* Details Dialog */}
      <UserDetailsModal
        user={activeUser}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setActiveUser(null);
        }}
      />

      {/* Status Transition Confirmation Dialog */}
      {activeUser && targetStatus && (
        <UserStatusDialog
          user={activeUser}
          targetStatus={targetStatus}
          isOpen={isStatusOpen}
          onClose={() => {
            setIsStatusOpen(false);
            setActiveUser(null);
            setTargetStatus(null);
          }}
          onConfirm={handleStatusConfirm}
          isSubmitting={updateStatusMutation.isPending}
        />
      )}
    </div>
  );
}
