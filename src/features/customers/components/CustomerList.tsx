"use client";

import React, { useState, useEffect } from "react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { useCustomers } from "../hooks/useCustomers";
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
import { useDeleteCustomer } from "../hooks/useDeleteCustomer";
import CustomerTable from "./CustomerTable";
import CustomerForm from "./CustomerForm";
import CustomerDetails from "./CustomerDetails";
import CustomerDeleteDialog from "./CustomerDeleteDialog";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, RefreshCw, XCircle, AlertCircle, Sparkles, HelpCircle, AlertTriangle } from "lucide-react";
import type { Customer } from "../types/customer.types";
import type { CustomerFormValues } from "../schemas/customer.schema";

export default function CustomerList() {
  const { user } = useAuth();
  const { currentBranchId, isAllBranchesSelected, currentBranch } = useBranchContext();

  const canCreate = hasPermission(user, "customers.create");

  // State Management
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [viewState, setViewState] = useState<"list" | "details">("list");
  
  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  
  // Notification alert state
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch paginated active customers
  const {
    data: customerData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCustomers({
    search: debouncedSearch || undefined,
    page,
    limit: 10,
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
      onError: (err: any) => {
        triggerAlert("error", err.message || "Failed to create customer.");
      },
    });
  };

  const handleEditSubmit = (values: CustomerFormValues) => {
    if (!activeCustomer) return;
    updateMutation.mutate(
      { id: activeCustomer.id, payload: values },
      {
        onSuccess: (updated) => {
          setIsEditOpen(false);
          setActiveCustomer(updated);
          triggerAlert("success", "Customer profile updated successfully.");
        },
        onError: (err: any) => {
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
        if (activeCustomer?.id === customerToDelete.id) {
          setViewState("list");
          setActiveCustomer(null);
        }
        triggerAlert("success", "Customer profile deactivated successfully.");
      },
      onError: (err: any) => {
        setIsDeleteOpen(false);
        triggerAlert("error", err.message || "Failed to deactivate customer.");
      },
    });
  };

  const triggerAlert = (type: "success" | "error", text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const getFriendlyErrorMessage = (err: any) => {
    if (!err) return "An unexpected error occurred while retrieving customer records.";
    const status = err.response?.status || err.status;
    const message = err.response?.data?.message || err.message || "";

    if (status === 401) {
      return "Your session has expired. Please log in again to continue.";
    }
    if (status === 403) {
      return "You do not have the required permissions to view customer profiles in this scope.";
    }
    if (status === 404) {
      return "The requested directory resource could not be found.";
    }
    if (status >= 500 || message.includes("500") || message.toLowerCase().includes("request failed")) {
      return "We are experiencing temporary server difficulties. Please try again in a few moments.";
    }
    if (message.toLowerCase().includes("network error") || (typeof navigator !== "undefined" && !navigator.onLine)) {
      return "Connection failed. Please check your network connection and try again.";
    }
    return message || "An unexpected error occurred while retrieving customer records.";
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl p-8 max-w-md mx-auto mt-12 shadow-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Service Unavailable</h3>
        <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
          {getFriendlyErrorMessage(error)}
        </p>
        <Button onClick={() => refetch()} className="mt-6 flex items-center gap-2 cursor-pointer w-full sm:w-auto">
          <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
          Try Reconnecting
        </Button>
      </div>
    );
  }

  // Handle detailed profile view transition
  if (viewState === "details" && activeCustomer) {
    return (
      <div className="space-y-6">
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

        <CustomerDetails
          customer={activeCustomer}
          onBack={() => {
            setViewState("list");
            setActiveCustomer(null);
          }}
          onEdit={() => setIsEditOpen(true)}
          onDelete={() => {
            setCustomerToDelete(activeCustomer);
            setIsDeleteOpen(true);
          }}
        />

        {/* Edit Modal (scoped context details are immutable) */}
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
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Update Customer"
          />
        </Dialog>

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage profiles, registrations, and visibility scopes across branches.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {isAllBranchesSelected ? (
            <div className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>Select branch to register customer</span>
            </div>
          ) : (
            canCreate && (
              <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 shadow-md shadow-primary/10 cursor-pointer">
                <Plus size={16} />
                Add Customer
              </Button>
            )
          )}
        </div>
      </div>

      {/* Search and Context Display Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name or phone number..."
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0 bg-muted/30 border border-border/50 px-3 py-2 rounded-lg">
          <span>Active Scope:</span>
          <span className="font-semibold text-foreground">
            {isAllBranchesSelected ? "All Branches (Consolidated)" : currentBranch?.name}
          </span>
          {isRefetching && <RefreshCw size={12} className="animate-spin text-primary ml-1" />}
        </div>
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
        debouncedSearch ? (
          /* Empty Search results state */
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-card/20 p-8 max-w-sm mx-auto">
            <HelpCircle className="text-muted-foreground/60 h-10 w-10 mb-3" />
            <p className="text-sm font-semibold text-foreground">No matches found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              No active customer matches &ldquo;{debouncedSearch}&rdquo;. Try checking the spelling or query parameters.
            </p>
            <Button variant="outline" size="sm" onClick={() => setSearch("")} className="mt-4 cursor-pointer">
              Clear Search Query
            </Button>
          </div>
        ) : (
          /* Empty Database state */
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-card/30 p-8 max-w-md mx-auto">
            <Sparkles className="text-primary/75 h-12 w-12 mb-4 animate-pulse" />
            <h3 className="text-lg font-bold text-foreground">Customer Directory Empty</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
              {isAllBranchesSelected 
                ? "No customer profiles have been created yet in the organization."
                : `No customer records belong to ${currentBranch?.name} yet.`
              }
            </p>
            {!isAllBranchesSelected && canCreate && (
              <Button onClick={() => setIsCreateOpen(true)} className="mt-6 flex items-center gap-1.5 cursor-pointer">
                <Plus size={16} />
                Register First Customer
              </Button>
            )}
          </div>
        )
      ) : (
        /* Data table view */
        <div className="space-y-4">
          <CustomerTable
            customers={customers}
            onView={(c) => {
              setActiveCustomer(c);
              setViewState("details");
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
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
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

      {/* Edit Dialog (Direct from Table click) */}
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
            onCancel={() => setIsEditOpen(false)}
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
