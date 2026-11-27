"use client";

import React, { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { AxiosError } from "axios";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState } from "@/components/ui/error-state";
import { CouponFilters } from "./CouponFilters";
import { CouponTable } from "./CouponTable";
import { CouponFormDialog } from "./CouponFormDialog";
import { CouponDeleteDialog } from "./CouponDeleteDialog";
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useUpdateCouponStatus,
  useDeleteCoupon,
} from "../hooks/useCoupons";
import {
  Coupon,
  CouponStatus,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../types/coupon.types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import {
  Ticket,
  Plus,
  Tag,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

export const CouponsView: React.FC = () => {
  const { user } = useAuth();
  const canConfigure = hasPermission(user, "coupons.configure");

  // Query state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<CouponStatus | "all">("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  // TanStack Query Hooks
  const {
    data: responseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useCoupons({
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter,
  });

  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const toggleStatusMutation = useUpdateCouponStatus();
  const deleteMutation = useDeleteCoupon();

  // Handlers
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusChange = (val: CouponStatus | "all") => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (coupon: Coupon) => {
    setDeletingCoupon(coupon);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const couponId = coupon.id || coupon._id;
    if (!couponId) return;

    const nextStatus: CouponStatus = coupon.status === "active" ? "inactive" : "active";
    try {
      await toggleStatusMutation.mutateAsync({
        id: couponId,
        payload: { status: nextStatus },
      });
      toast.success(
        `Coupon ${coupon.code} is now ${nextStatus === "active" ? "activated" : "deactivated"}.`
      );
    } catch (err: unknown) {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : undefined;
      toast.error(
        message || `Failed to update status for coupon ${coupon.code}.`
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCoupon) return;
    const couponId = deletingCoupon.id || deletingCoupon._id;
    if (!couponId) return;

    try {
      await deleteMutation.mutateAsync(couponId);
      toast.success(`Coupon ${deletingCoupon.code} deleted successfully.`);
      setIsDeleteOpen(false);
      setDeletingCoupon(null);
    } catch (err: unknown) {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message || err.message
          : err instanceof Error
          ? err.message
          : undefined;
      toast.error(
        message || `Failed to delete coupon ${deletingCoupon.code}.`
      );
    }
  };

  const handleFormSubmit = async (payload: CreateCouponPayload | UpdateCouponPayload) => {
    if (editingCoupon) {
      const couponId = editingCoupon.id || editingCoupon._id;
      if (!couponId) return;
      await updateMutation.mutateAsync({
        id: couponId,
        payload: payload as UpdateCouponPayload,
      });
      toast.success(`Coupon ${editingCoupon.code} updated successfully.`);
    } else {
      const created = await createMutation.mutateAsync(payload as CreateCouponPayload);
      toast.success(`Coupon ${created.data.code} created successfully.`);
    }
  };

  const coupons: Coupon[] = responseData?.data?.coupons || [];
  const pagination = responseData?.data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  // Authoritative metrics derived strictly from loaded data with clear scoping labels
  const pageActiveCount = coupons.filter((c: Coupon) => c.status === "active" && !c.isExpired).length;
  const pageExpiredCount = coupons.filter((c: Coupon) => c.isExpired).length;
  const pageInactiveCount = coupons.filter((c: Coupon) => c.status === "inactive" && !c.isExpired).length;
  const isFiltered = Boolean(search || statusFilter !== "all");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeaderBanner
        title="Promotional Coupons"
        description="Design and manage discount campaigns, set branch availability, and configure usage limits across your organization."
        icon={Ticket}
        actions={
          canConfigure && (
            <Button onClick={handleOpenCreate} className="gap-2 shadow-sm font-semibold">
              <Plus className="h-4 w-4" />
              Create Coupon
            </Button>
          )
        }
      />

      {/* Authoritative Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Matching</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "—" : pagination.total}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active (Current View)</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "—" : pageActiveCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Expired (Current View)</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "—" : pageExpiredCount}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Inactive (Current View)</p>
              <p className="text-xl font-bold text-foreground">
                {isLoading ? "—" : pageInactiveCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <CouponFilters
        search={search}
        status={statusFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onReset={handleClearFilters}
        isFiltered={isFiltered}
        onRefresh={() => refetch()}
        isLoading={isLoading}
      />

      {/* Error State or Table */}
      {isError ? (
        <ErrorState
          title="Failed to load coupons"
          description={
            (error instanceof AxiosError
              ? error.response?.data?.message || error.message
              : error instanceof Error
              ? error.message
              : undefined) ||
            "An error occurred while loading coupon campaigns. Please try refreshing."
          }
          retryAction={{
            label: "Retry",
            onClick: () => refetch(),
          }}
        />
      ) : (
        <div className="space-y-4">
          <CouponTable
            coupons={coupons}
            isLoading={isLoading}
            canConfigure={canConfigure}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onToggleStatus={handleToggleStatus}
            isTogglingStatus={toggleStatusMutation.isPending}
          />

          {pagination.total > 0 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              onPageChange={(newPage) => setPage(newPage)}
              pageSize={limit}
              onPageSizeChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              itemLabel="coupons"
            />
          )}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <CouponFormDialog
        isOpen={isFormOpen}
        couponToEdit={editingCoupon}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCoupon(null);
        }}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <CouponDeleteDialog
        coupon={deletingCoupon}
        isOpen={isDeleteOpen}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingCoupon(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
