"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useCustomers } from "../hooks/useCustomers";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import { useDeleteCustomer } from "../hooks/useDeleteCustomer";
import CustomerTable from "./CustomerTable";
import CustomerForm from "./CustomerForm";
import CustomerDeleteDialog from "./CustomerDeleteDialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Plus, Sparkles, HelpCircle } from "lucide-react";
import type { Customer } from "../types/customer.types";
import type { CustomerFormValues } from "../schemas/customer.schema";
import { CustomerListHeader } from "./CustomerListHeader";
import { CustomerSearch } from "./CustomerSearch";
import { CustomerFilters } from "./CustomerFilters";

export default function CustomerList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { user } = useAuth();
  const { isAllBranchesSelected, currentBranch } = useBranchContext();

  const canCreate = hasPermission(user, "customers.create");

  // Read page parameter from URL
  const pageParam = searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  // Read search parameter from URL
  const searchQueryParam = searchParams.get("search") || "";

  // Read status filter parameter from URL
  const isActiveParam = searchParams.get("isActive");
  const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

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

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  // Notification alert state
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    if (val === "active") {
      params.set("isActive", "true");
    } else if (val === "inactive") {
      params.set("isActive", "false");
    } else {
      params.delete("isActive");
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

  // Fetch paginated customers based on URL query state
  const {
    data: customerData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCustomers({
    search: searchQueryParam || undefined,
    page,
    limit: 10,
    isActive,
    sort: sort || undefined,
  });

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();


  const handleCreateSubmit = (values: CustomerFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        setIsCreateOpen(false);
        triggerAlert("success", "Customer profile created successfully.");
      },
      onError: (err: Error) => {
        triggerAlert("error", err.message || "Failed to create customer.");
      },
    });
  };

  const handleEditSubmit = (values: CustomerFormValues) => {
    if (!activeCustomer) return;
    updateMutation.mutate(
      { id: activeCustomer.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setActiveCustomer(null);
          triggerAlert("success", "Customer profile updated successfully.");
        },
        onError: (err: Error) => {
          triggerAlert("error", err.message || "Failed to update customer.");
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!customerToDelete) return;
    deleteMutation.mutate(customerToDelete.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setCustomerToDelete(null);
        triggerAlert("success", "Customer profile deactivated successfully.");
      },
      onError: (err: Error) => {
        setIsDeleteOpen(false);
        triggerAlert("error", err.message || "Failed to deactivate customer.");
      },
    });
  };

  const triggerAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const getFriendlyErrorMessage = (err: unknown) => {
    if (!err) return "An unexpected error occurred while retrieving customer records.";
    
    const errObj = err as Record<string, unknown> | null;
    const responseObj = errObj?.response as Record<string, unknown> | null;
    const status = (responseObj?.status as number | undefined) || (errObj?.status as number | undefined);
    const message = (responseObj?.data as Record<string, unknown> | null)?.message as string | undefined
      || (errObj?.message as string | undefined) || "";


    if (status === 401) {
      return "Your session has expired. Please log in again to continue.";
    }
    if (status === 403) {
      return "You do not have the required permissions to view customer profiles in this scope.";
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
    return message || "An unexpected error occurred while retrieving customer records.";
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

  const pagination = customerData?.pagination;
  const customers = customerData?.customers || [];

  return (
    <div className="space-y-6">
      {/* Success/Error Banner alerts */}
      {alertMessage && (
        <div
          className={`p-3 rounded-lg border text-sm font-semibold animate-in fade-in duration-200 ${
            alertMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {alertMessage.text}
        </div>
      )}

      {/* Directory Page Header */}
      <CustomerListHeader
        isAllBranchesSelected={isAllBranchesSelected}
        canCreate={canCreate}
        onAddClick={() => setIsCreateOpen(true)}
      />

      {/* Search and Context Display Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between">
        <CustomerSearch value={search} onChange={setSearch} />
        
        <CustomerFilters
          status={isActiveParam === "true" ? "active" : isActiveParam === "false" ? "inactive" : "all"}
          onStatusChange={handleStatusChange}
          sort={sort}
          onSortChange={handleSortChange}
          activeScopeName={isAllBranchesSelected ? "All Branches (Consolidated)" : currentBranch?.name || ""}
          isRefetching={isRefetching}
        />
      </div>

      {/* Loading Skeleton or Data Table */}
      {isLoading ? (
        <CustomerTable
          customers={[]}
          onView={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          isLoading={true}
          isAllBranches={isAllBranchesSelected}
        />
      ) : customers.length === 0 ? (
        searchQueryParam ? (
          <EmptyState
            icon={HelpCircle}
            title="No matches found"
            description={`No active customer matches "${searchQueryParam}". Try checking the spelling or query parameters.`}
            action={{
              label: "Clear Search Query",
              onClick: () => setSearch(""),
            }}
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Customer Directory Empty"
            description={
              isAllBranchesSelected
                ? "No customer profiles have been created yet in the organization."
                : `No customer records belong to ${currentBranch?.name} yet.`
            }
            action={
              !isAllBranchesSelected && canCreate
                ? {
                    label: "Register First Customer",
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
          <CustomerTable
            customers={customers}
            onView={(c) => {
              router.push(`/customers/${c.id}`);
            }}
            onEdit={(c) => {
              setActiveCustomer(c);
              setIsEditOpen(true);
            }}
            onDelete={(c) => {
              setCustomerToDelete(c);
              setIsDeleteOpen(true);
            }}
            isLoading={false}
            isAllBranches={isAllBranchesSelected}
          />
          
          {/* Pagination Controls */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">
                Showing page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{pagination.pages}</strong> ({pagination.total} total customers)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(page - 1, 1))}
                  disabled={page === 1}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(page + 1, pagination.pages))}
                  disabled={page === pagination.pages}
                  className="cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Register New Customer">
        <CustomerForm
          onSubmit={handleCreateSubmit}
          isSubmitting={createMutation.isPending}
          onCancel={() => setIsCreateOpen(false)}
          submitLabel="Create Customer"
        />
      </Dialog>

      {/* Edit Dialog */}
      {isEditOpen && activeCustomer && (
        <Dialog isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Customer Details">
          <CustomerForm
            initialData={{
              name: activeCustomer.name,
              phone: activeCustomer.phone,
              email: activeCustomer.email || "",
              gender: activeCustomer.gender || "",
              dateOfBirth: activeCustomer.dateOfBirth || "",
              address: activeCustomer.address || "",
              notes: activeCustomer.notes || "",
            }}
            onSubmit={handleEditSubmit}
            isSubmitting={updateMutation.isPending}
            onCancel={() => {
              setIsEditOpen(false);
              setActiveCustomer(null);
            }}
            submitLabel="Update Customer"
          />
        </Dialog>
      )}

      {/* Delete Dialog */}
      {customerToDelete && (
        <CustomerDeleteDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteMutation.isPending}
          customerName={customerToDelete.name}
        />
      )}
    </div>
  );
}

