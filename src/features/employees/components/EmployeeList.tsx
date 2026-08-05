"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useEmployees, useDeleteEmployee, useUpdateEmployeeStatus, useCreateEmployee, useUpdateEmployee } from "../hooks/useEmployees";
import EmployeeTable from "./EmployeeTable";
import EmployeeDeleteDialog from "./EmployeeDeleteDialog";
import EmployeeReactivateDialog from "./EmployeeReactivateDialog";
import EmployeeForm from "./EmployeeForm";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Plus, Sparkles, HelpCircle } from "lucide-react";
import type { Employee, EmployeePayload } from "../types/employee.types";
import { EmployeeListHeader } from "./EmployeeListHeader";
import { EmployeeSearch } from "./EmployeeSearch";
import { EmployeeFilters } from "./EmployeeFilters";

export default function EmployeeList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { isAllBranchesSelected, currentBranch } = useBranchContext();

  const canCreate = hasPermission(user, "employees.create");

  // Read page parameter from URL
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Read limit parameter from URL
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  // Read search parameter from URL
  const searchQueryParam = searchParams.get("search") || "";

  // Read status filter parameter from URL
  const statusParam = searchParams.get("status") || "all";

  // Read role filter parameter from URL
  const roleParam = searchParams.get("role") || "all";

  // Read sort parameter from URL
  const sort = searchParams.get("sort") || "";

  // Local state for immediate typing responsiveness
  const [search, setSearch] = useState(searchQueryParam);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQueryParam);

  // Sync state during render when URL query changes (e.g. Back/Forward navigation)
  if (searchQueryParam !== prevSearchQuery) {
    setPrevSearchQuery(searchQueryParam);
    setSearch(searchQueryParam);
  }

  // Modal/dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReactivateOpen, setIsReactivateOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [employeeToReactivate, setEmployeeToReactivate] = useState<Employee | null>(null);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const reactivateMutation = useUpdateEmployeeStatus();

  // Memoized callbacks for EmployeeTable to prevent re-render loops
  const handleView = useCallback((emp: Employee) => {
    toast.info(`Viewing details for ${emp.firstName} ${emp.lastName}. Profile pages will be implemented in a future update.`);
  }, []);

  const handleEdit = useCallback((emp: Employee) => {
    setActiveEmployee(emp);
    setIsEditOpen(true);
  }, []);

  const handleDelete = useCallback((emp: Employee) => {
    setEmployeeToDelete(emp);
    setIsDeleteOpen(true);
  }, []);

  const handleReactivate = useCallback((emp: Employee) => {
    setEmployeeToReactivate(emp);
    setIsReactivateOpen(true);
  }, []);

  // Debounce search input and sync with URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQuery = searchParams.get("search") || "";
      if (search !== currentQuery) {
        const params = new URLSearchParams(searchParams.toString());
        if (search.trim()) {
          params.set("search", search.trim());
        } else {
          params.delete("search");
        }
        params.set("page", "1"); // Reset to page 1 on new search query
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, router, pathname, searchParams]);

  const handleStatusChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== "all") {
      params.set("status", val);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRoleChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== "all") {
      params.set("role", val);
    } else {
      params.delete("role");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("sort", val);
    } else {
      params.delete("sort");
    }
    params.set("page", "1");
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

  // Fetch paginated employees based on URL query state
  const {
    data: employeeData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useEmployees({
    search: searchQueryParam || undefined,
    page,
    limit,
    status: statusParam !== "all" ? statusParam : undefined,
    role: roleParam !== "all" ? roleParam : undefined,
    sortBy: sort || undefined,
  });

  const handleSync = async () => {
    try {
      await refetch();
      toast.success("Employee list synchronized successfully.");
    } catch {
      toast.error("Failed to synchronize employee list.");
    }
  };

  const handleCreateSubmit = (values: EmployeePayload) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        toast.success("Employee profile created successfully.");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to create employee.");
      },
    });
  };

  const handleEditSubmit = (values: EmployeePayload) => {
    if (!activeEmployee) return;
    updateMutation.mutate(
      { id: activeEmployee.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setActiveEmployee(null);
          toast.success("Employee profile updated successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to update employee.");
        },
      }
    );
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newPageSize.toString());
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDeleteConfirm = () => {
    if (!employeeToDelete) return;
    deleteMutation.mutate(employeeToDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setEmployeeToDelete(null);
        toast.success("Employee profile deactivated successfully.");
      },
      onError: (err: Error) => {
        setIsDeleteOpen(false);
        toast.error(err.message || "Failed to deactivate employee.");
      },
    });
  };

  const handleReactivateConfirm = () => {
    if (!employeeToReactivate) return;
    reactivateMutation.mutate(
      { id: employeeToReactivate.id, status: "active" },
      {
        onSuccess: () => {
          setIsReactivateOpen(false);
          setEmployeeToReactivate(null);
          reactivateMutation.reset();
          toast.success("Employee profile reactivated successfully.");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to reactivate employee.");
        },
      }
    );
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const getFriendlyErrorMessage = (err: unknown) => {
    if (!err) return "An unexpected error occurred while retrieving employee records.";
    
    const errObj = err as Record<string, unknown> | null;
    const responseObj = errObj?.response as Record<string, unknown> | null;
    const status = (responseObj?.status as number | undefined) || (errObj?.status as number | undefined);
    const message = (responseObj?.data as Record<string, unknown> | null)?.message as string | undefined
      || (errObj?.message as string | undefined) || "";

    if (status === 401) {
      return "Your session has expired. Please log in again to continue.";
    }
    if (status === 403) {
      return "You do not have the required permissions to view employee profiles in this scope.";
    }
    if (status === 404) {
      return "The requested directory resource could not be found.";
    }
    if ((status !== undefined && status >= 500) || message.includes("500") || message.toLowerCase().includes("request failed")) {
      return "We are experiencing temporary server difficulties. Please try again in a few moments.";
    }
    if (message.toLowerCase().includes("network error") || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return "Connection failed. Please check your network connection and try again.";
    }
    return message || "An unexpected error occurred while retrieving employee records.";
  };

  if (isError) {
    return (
      <ErrorState
        title="Service Unavailable"
        description={getFriendlyErrorMessage(error)}
        retryAction={{
          label: "Try Reconnecting",
          onClick: () => refetch(),
          isLoading: isRefetching,
        }}
      />
    );
  }

  const pagination = employeeData?.meta;
  const employees = employeeData?.data || [];

  return (
    <div className="space-y-6">
      {/* Directory Page Header */}
      <EmployeeListHeader
        canCreate={canCreate}
        onAddClick={() => setIsCreateOpen(true)}
        isSyncing={isRefetching}
        onSync={handleSync}
      />

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
        <EmployeeSearch 
          value={search} 
          onChange={setSearch} 
          isLoading={isRefetching}
        />
        
        <EmployeeFilters
          status={statusParam}
          onStatusChange={handleStatusChange}
          role={roleParam}
          onRoleChange={handleRoleChange}
          sort={sort}
          onSortChange={handleSortChange}
          onClearFilters={handleClearFilters}
          activeScopeName={isAllBranchesSelected ? "All Branches (Consolidated)" : currentBranch?.name || ""}
          isRefetching={isRefetching}
        />
      </div>

      {/* Loading Skeleton or Data Table */}
      {isLoading ? (
        <EmployeeTable
          employees={[]}
          onView={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onReactivate={() => {}}
          isLoading={true}
        />
      ) : employees.length === 0 ? (
        searchQueryParam || statusParam !== "all" || roleParam !== "all" ? (
          <EmptyState
            icon={HelpCircle}
            title="No matches found"
            description="Try expanding your search query or resetting filters."
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
            title="Staff Directory Empty"
            description={
              isAllBranchesSelected
                ? "No employee profiles have been created yet in the organization."
                : `No employee records belong to ${currentBranch?.name} yet.`
            }
            action={
              canCreate
                ? {
                    label: "Register First Employee",
                    onClick: () => toast.info("Employee registration form will be implemented in a future update."),
                    icon: Plus,
                  }
                : undefined
            }
          />
        )
      ) : (
        /* Data table view */
        <div className="space-y-4">
          <EmployeeTable
            employees={employees}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReactivate={handleReactivate}
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
              itemLabel="employees"
            />
          )}
        </div>
      )}

      {/* Delete Dialog */}
      {employeeToDelete && (
        <EmployeeDeleteDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteMutation.isPending}
          employeeName={`${employeeToDelete.firstName} ${employeeToDelete.lastName}`}
        />
      )}

      {/* Reactivate Dialog */}
      {employeeToReactivate && (
        <EmployeeReactivateDialog
          isOpen={isReactivateOpen}
          onClose={() => {
            setIsReactivateOpen(false);
            setEmployeeToReactivate(null);
            reactivateMutation.reset();
          }}
          onConfirm={handleReactivateConfirm}
          isLoading={reactivateMutation.isPending}
          error={reactivateMutation.error}
          employeeName={`${employeeToReactivate.firstName} ${employeeToReactivate.lastName}`}
        />
      )}

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Employee">
        <EmployeeForm
          onSubmit={handleCreateSubmit}
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreateOpen(false)}
          submitLabel="Create Employee"
          error={createMutation.error}
        />
      </Dialog>

      {/* Edit Dialog */}
      {isEditOpen && activeEmployee && (
        <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Employee Details">
          <EmployeeForm
            initialEmployee={activeEmployee}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
            onCancel={() => {
              setIsEditOpen(false);
              setActiveEmployee(null);
            }}
            submitLabel="Update Employee"
            error={updateMutation.error}
          />
        </Dialog>
      )}
    </div>
  );
}
