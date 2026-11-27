"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  supplierFormSchema,
  SupplierFormValues,
} from "../schemas/procurement.schemas";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "../hooks/useProcurement";
import { Supplier } from "../types/procurement.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Search,
  Plus,
  Truck,
  Phone,
  Building,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";

export default function SupplierDirectoryView() {
  const { user } = useAuth();
  const canManage = hasPermission(user, "procurement.suppliers.manage");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | undefined
  >(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isFetching, refetch } = useSuppliers({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter,
  });

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier(editingSupplier?.id || "");
  const deleteMutation = useDeleteSupplier();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      status: "active",
      paymentTermsDays: 30,
    },
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    reset({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      paymentTermsDays: 30,
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(sup);
    reset({
      name: sup.name,
      contactPerson: sup.contactPerson || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
      paymentTermsDays: sup.paymentTermsDays || 30,
      status: sup.status,
      bankDetails: sup.bankDetails,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(sup);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    if (selectedSupplier?.id === deleteTarget.id) {
      setSelectedSupplier(null);
    }
    setDeleteTarget(null);
  };

  const onSubmit = async (values: SupplierFormValues) => {
    if (editingSupplier) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
    setIsModalOpen(false);
  };

  const suppliers: Supplier[] = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Truck className="h-6 w-6 text-primary" />
            Supplier Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Maintain authorized vendor profiles, payment credit terms, and
            purchasing contacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {canManage && (
            <Button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant={statusFilter === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(undefined)}
            className="text-xs"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="text-xs"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            className="text-xs"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Supplier Grid & Details Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border animate-pulse">
              Loading authorized suppliers...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-3">
              <Truck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold text-foreground">
                No suppliers found
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No vendor records match your query. Add your first beauty
                distributor to start issuing POs.
              </p>
              {canManage && (
                <Button size="sm" onClick={handleOpenAdd} className="mt-2">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Register Supplier
                </Button>
              )}
            </div>
          ) : (
            suppliers.map((sup: Supplier) => (
              <div
                key={sup.id}
                onClick={() => setSelectedSupplier(sup)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-4 ${
                  selectedSupplier?.id === sup.id
                    ? "bg-primary/5 border-primary shadow-xs"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {sup.name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sup.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sup.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {sup.contactPerson && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {sup.contactPerson}
                      </span>
                    )}
                    {sup.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {sup.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sup.paymentTermsDays || 30} days credit
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleOpenEdit(sup, e)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit supplier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(sup, e)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Delete supplier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          {data?.meta && (
            <Pagination
              currentPage={Number(data.meta.page)}
              totalPages={data.meta.totalPages}
              totalItems={data.meta.total}
              onPageChange={setPage}
              pageSize={limit}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="suppliers"
            />
          )}
        </div>

        {/* Selected Supplier Detail Card */}
        <div className="lg:col-span-1">
          {selectedSupplier ? (
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {selectedSupplier.name}
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Vendor Profile
                  </span>
                </div>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleOpenEdit(selectedSupplier, e)}
                    className="h-7 text-xs"
                  >
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    Contact Person
                  </label>
                  <p className="font-medium text-foreground mt-0.5">
                    {selectedSupplier.contactPerson || "Not specified"}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    Phone & Email
                  </label>
                  <p className="font-medium text-foreground mt-0.5">
                    {selectedSupplier.phone || "No phone"}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedSupplier.email || "No email"}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    Office / Warehouse Address
                  </label>
                  <p className="font-medium text-foreground mt-0.5">
                    {selectedSupplier.address || "No address specified"}
                  </p>
                </div>

                <div>
                  <label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                    Payment Terms
                  </label>
                  <p className="font-medium text-foreground mt-0.5">
                    Net {selectedSupplier.paymentTermsDays || 30} Days
                  </p>
                </div>

                {selectedSupplier.bankDetails?.bankName && (
                  <div className="pt-2 border-t border-border">
                    <label className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                      Settlement Bank Account
                    </label>
                    <p className="font-medium text-foreground mt-0.5">
                      {selectedSupplier.bankDetails.bankName}
                    </p>
                    <p className="text-muted-foreground">
                      A/C: {selectedSupplier.bankDetails.accountNo || "N/A"} |
                      IFSC: {selectedSupplier.bankDetails.ifscCode || "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card/50 rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Select a supplier on the left to inspect vendor profile, credit
              terms, and bank details.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingSupplier ? "Edit Supplier Record" : "Register New Supplier"
        }
        maxWidth="md"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 py-2 text-xs"
        >
          <div>
            <label className="font-medium text-foreground">
              Supplier Name *
            </label>
            <Input
              {...register("name")}
              className="mt-1"
              placeholder="e.g. L'Oreal Professional"
            />
            {errors.name && (
              <p className="text-red-500 text-[11px] mt-0.5">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">
                Contact Person
              </label>
              <Input
                {...register("contactPerson")}
                className="mt-1"
                placeholder="Key contact"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">Phone</label>
              <Input
                {...register("phone")}
                className="mt-1"
                placeholder="Direct line"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">Email</label>
              <Input
                {...register("email")}
                className="mt-1"
                placeholder="orders@vendor.com"
              />
              {errors.email && (
                <p className="text-red-500 text-[11px] mt-0.5">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="font-medium text-foreground">
                Payment Terms (Days)
              </label>
              <Input
                type="number"
                {...register("paymentTermsDays", { valueAsNumber: true })}
                className="mt-1"
                placeholder="30"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">Address</label>
            <Input
              {...register("address")}
              className="mt-1"
              placeholder="Warehouse address"
            />
          </div>

          <div className="pt-2 border-t border-border">
            <span className="font-semibold text-muted-foreground text-[11px]">
              Bank Details
            </span>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <Input
                {...register("bankDetails.bankName")}
                placeholder="Bank Name"
                className="text-xs"
              />
              <Input
                {...register("bankDetails.ifscCode")}
                placeholder="IFSC Code"
                className="text-xs"
              />
              <Input
                {...register("bankDetails.accountNo")}
                placeholder="Account Number"
                className="col-span-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingSupplier ? "Save Changes" : "Register Supplier"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Supplier Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Supplier"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>
            ? This action will archive the supplier from active directories.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Supplier"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
