"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  CreditCard,
  Sparkles,
  HelpCircle,
  Layers,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeaderBanner } from "@/components/ui/page-header-banner";
import { SyncButton } from "@/components/ui/sync-button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useDebounce } from "@/hooks/useDebounce";
import { hasPermission } from "@/lib/permissions";
import { SUBSCRIPTIONS_CONFIG } from "../config/subscriptions.config";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useCreateSubscription } from "../hooks/useCreateSubscription";
import { useUpdateSubscription } from "../hooks/useUpdateSubscription";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { useRenewSubscription } from "../hooks/useRenewSubscription";
import {
  useSubscriptionPlans,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useDeleteSubscriptionPlan,
} from "../hooks/useSubscriptionPlans";
import { getSubscriptionColumns } from "../columns/subscription.columns";
import { SubscriptionTable } from "./SubscriptionTable";
import { SubscriptionFilters } from "./SubscriptionFilters";
import { CreateSubscriptionDialog } from "./CreateSubscriptionDialog";
import { EditSubscriptionDialog } from "./EditSubscriptionDialog";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { RenewSubscriptionDialog } from "./RenewSubscriptionDialog";
import { RedeemSubscriptionModal } from "./RedeemSubscriptionModal";
import { SubscriptionPlanTable } from "./SubscriptionPlanTable";
import { PlanFormDialog } from "./PlanFormDialog";
import type { Subscription } from "../types/subscription.types";
import type { SubscriptionPlan } from "../types/plan.types";
import type {
  CreateSubscriptionFormValues,
  UpdateSubscriptionFormValues,
  CancelSubscriptionFormValues,
  RenewSubscriptionFormValues,
} from "../schemas/subscription.schema";
import type { CreateSubscriptionPlanFormValues } from "../schemas/plan.schema";

export function SubscriptionList() {
  const router = useRouter();
  const { user } = useAuth();
  const { getBranchName } = useBranchContext();

  const [activeTab, setActiveTab] = useState<"subscriptions" | "plans">(
    "subscriptions",
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(
    SUBSCRIPTIONS_CONFIG.defaults.pageSize,
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const debouncedSearch = useDebounce(search, 350);

  // Modal states for customer subscriptions
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeSubscription, setActiveSubscription] =
    useState<Subscription | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [selectedPlanForCustomer, setSelectedPlanForCustomer] =
    useState<SubscriptionPlan | null>(null);

  // Modal states for plans
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);

  const [isRenewOpen, setIsRenewOpen] = useState(false);

  // Permissions
  const canView = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.view);
  const canSell = hasPermission(user, SUBSCRIPTIONS_CONFIG.permissions.sell);
  const canConfigure = hasPermission(
    user,
    SUBSCRIPTIONS_CONFIG.permissions.configure,
  );
  const canRedeem = hasPermission(
    user,
    SUBSCRIPTIONS_CONFIG.permissions.redeem,
  );

  const { data, isLoading, isRefetching, isError, refetch } = useSubscriptions({
    page,
    limit: pageSize,
    search: debouncedSearch.trim() || undefined,
    status: status !== "all" ? status : undefined,
  });

  const {
    data: plansData,
    isLoading: isLoadingPlans,
    isRefetching: isRefetchingPlans,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useSubscriptionPlans({
    search: debouncedSearch.trim() || undefined,
  });

  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const cancelMutation = useCancelSubscription();
  const renewMutation = useRenewSubscription();

  const createPlanMutation = useCreateSubscriptionPlan();
  const updatePlanMutation = useUpdateSubscriptionPlan();
  const deletePlanMutation = useDeleteSubscriptionPlan();

  const subscriptions = data?.data || [];
  const meta = data?.meta;
  const plans = plansData?.data || [];

  const handleView = React.useCallback(
    (sub: Subscription) => {
      router.push(SUBSCRIPTIONS_CONFIG.routes.subscriptions.detail(sub.id));
    },
    [router],
  );

  const handleEdit = React.useCallback((sub: Subscription) => {
    setActiveSubscription(sub);
    setIsEditOpen(true);
  }, []);

  const handleCancel = React.useCallback((sub: Subscription) => {
    setActiveSubscription(sub);
    setIsCancelOpen(true);
  }, []);

  const handleRedeem = React.useCallback((sub: Subscription) => {
    setActiveSubscription(sub);
    setIsRedeemOpen(true);
  }, []);

  const handleRenew = React.useCallback((sub: Subscription) => {
    setActiveSubscription(sub);
    setIsRenewOpen(true);
  }, []);

  const handleCreateSubmit = async (values: CreateSubscriptionFormValues) => {
    try {
      const createdSub = await createMutation.mutateAsync({
        customerId: values.customerId,
        planId: values.planId,
        price: values.price,
        entitlements: values.entitlements,
        permittedBranchIds: values.permittedBranchIds,
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes,
      });

      setIsCreateOpen(false);

      const invoiceId = createdSub.invoiceId || createdSub.invoice?.id;
      const invoiceNumber = createdSub.invoiceNumber || createdSub.invoice?.invoiceNumber || "";

      if (invoiceId) {
        toast.success(
          `Subscription sold! Sale invoice ${invoiceNumber} created (${createdSub.paymentStatus === "paid" ? "Paid" : "Pending Payment"}).`,
          {
            action: {
              label: "View Invoice",
              onClick: () => router.push(`/billing/${invoiceId}`),
            },
            duration: 6000,
          }
        );
        router.push(`/billing/${invoiceId}`);
      } else {
        toast.success("Subscription sold and created successfully.");
      }
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to create subscription.";
      toast.error(msg);
    }
  };

  const handleRenewSubmit = async (values: RenewSubscriptionFormValues) => {
    if (!activeSubscription) return;
    try {
      const renewedSub = await renewMutation.mutateAsync({
        id: activeSubscription.id,
        payload: {
          endDate: values.endDate,
          price: values.price,
          notes: values.notes,
        },
      });

      setIsRenewOpen(false);
      setActiveSubscription(null);

      const invoiceId = renewedSub.invoiceId || renewedSub.invoice?.id;
      const invoiceNumber = renewedSub.invoiceNumber || renewedSub.invoice?.invoiceNumber || "";

      if (invoiceId) {
        toast.success(
          `Subscription renewed! Renewal invoice ${invoiceNumber} created (${renewedSub.paymentStatus === "paid" ? "Paid" : "Pending Payment"}).`,
          {
            action: {
              label: "View Invoice",
              onClick: () => router.push(`/billing/${invoiceId}`),
            },
            duration: 6000,
          }
        );
        router.push(`/billing/${invoiceId}`);
      } else {
        toast.success("Subscription renewed successfully.");
      }
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to renew subscription.";
      toast.error(msg);
    }
  };

  const handleEditSubmit = async (values: UpdateSubscriptionFormValues) => {
    if (!activeSubscription) return;
    try {
      await updateMutation.mutateAsync({
        id: activeSubscription.id,
        payload: values,
      });
      toast.success("Subscription updated successfully.");
      setIsEditOpen(false);
      setActiveSubscription(null);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to update subscription.";
      toast.error(msg);
    }
  };

  const handleCancelConfirm = async (values: CancelSubscriptionFormValues) => {
    if (!activeSubscription) return;
    try {
      await cancelMutation.mutateAsync({
        id: activeSubscription.id,
        payload: values,
      });
      toast.success("Subscription has been cancelled.");
      setIsCancelOpen(false);
      setActiveSubscription(null);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to cancel subscription.";
      toast.error(msg);
    }
  };

  const columns = React.useMemo(
    () =>
      getSubscriptionColumns({
        onView: handleView,
        onEdit: handleEdit,
        onCancel: handleCancel,
        onRedeem: handleRedeem,
        onRenew: handleRenew,
        canView,
        canEdit: canConfigure,
        canCancel: canConfigure,
        canRedeem,
        canRenew: canSell,
        getBranchName,
      }),
    [
      handleView,
      handleEdit,
      handleCancel,
      handleRedeem,
      handleRenew,
      canView,
      canConfigure,
      canRedeem,
      canSell,
      getBranchName,
    ],
  );

  const handleCreatePlanSubmit = async (
    values: CreateSubscriptionPlanFormValues,
  ) => {
    try {
      const planId =
        activePlan?.id || (activePlan as unknown as { _id?: string })?._id;
      if (activePlan && planId) {
        await updatePlanMutation.mutateAsync({
          id: planId,
          payload: values,
        });
        toast.success("Subscription plan updated successfully.");
      } else {
        await createPlanMutation.mutateAsync(values);
        toast.success("Subscription plan template created successfully.");
      }
      setIsPlanFormOpen(false);
      setActivePlan(null);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to save subscription plan.";
      toast.error(msg);
    }
  };

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the plan "${plan.name}"?`,
      )
    ) {
      return;
    }
    try {
      const planId = plan.id || (plan as unknown as { _id?: string })?._id;
      if (!planId) throw new Error("Plan ID is missing");
      await deletePlanMutation.mutateAsync(planId);
      toast.success(`Plan "${plan.name}" deleted.`);
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown> | null;
      const responseObj = errorObj?.response as Record<string, unknown> | null;
      const msg =
        ((responseObj?.data as Record<string, unknown> | null)
          ?.message as string) ||
        (errorObj?.message as string) ||
        "Failed to delete plan.";
      toast.error(msg);
    }
  };

  const handleSelectPlanForCustomer = (plan: SubscriptionPlan) => {
    setSelectedPlanForCustomer(plan);
    setIsCreateOpen(true);
  };

  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const handleSync = async () => {
    setIsSyncingManual(true);
    try {
      if (activeTab === "subscriptions") {
        await refetch();
        toast.success("Subscriptions list synchronized successfully.");
      } else {
        await refetchPlans();
        toast.success("Plan templates catalog synchronized successfully.");
      }
    } catch {
      toast.error(
        activeTab === "subscriptions"
          ? "Failed to synchronize subscriptions."
          : "Failed to synchronize plan templates catalog.",
      );
    } finally {
      setIsSyncingManual(false);
    }
  };

  const isSubLoading =
    isLoading ||
    isRefetching ||
    (isSyncingManual && activeTab === "subscriptions");
  const isPlanLoading =
    isLoadingPlans ||
    isRefetchingPlans ||
    (isSyncingManual && activeTab === "plans");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeaderBanner
        title="Subscriptions & Packages"
        description="Manage customer-specific prepaid subscriptions, service entitlements, and plan templates across authorized branches."
        icon={CreditCard}
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <SyncButton
              isSyncing={
                isSyncingManual ||
                (activeTab === "subscriptions"
                  ? isRefetching
                  : isRefetchingPlans)
              }
              onSync={handleSync}
              label={
                activeTab === "subscriptions"
                  ? "Refresh Subscriptions"
                  : "Refresh Plans"
              }
              className="w-full sm:w-auto"
            />
            {canConfigure && activeTab === "plans" && (
              <Button
                type="button"
                onClick={() => {
                  setActivePlan(null);
                  setIsPlanFormOpen(true);
                }}
                className="h-9 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add Plan Template
              </Button>
            )}
            {canSell && (
              <Button
                type="button"
                onClick={() => {
                  setSelectedPlanForCustomer(null);
                  setIsCreateOpen(true);
                }}
                className="h-9 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Sell Subscription
              </Button>
            )}
          </div>
        }
      />

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("subscriptions")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "subscriptions"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Customer Subscriptions
          {subscriptions.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "subscriptions"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/10 text-muted-foreground"
              }`}
            >
              {meta?.total ?? subscriptions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === "plans"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Plan Templates Catalog
          {plans.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "plans"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/10 text-muted-foreground"
              }`}
            >
              {plans.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "subscriptions" ? (
        <>
          {/* Filter Toolbar */}
          <SubscriptionFilters
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            status={status}
            onStatusChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            onClear={() => {
              setSearch("");
              setStatus("all");
              setPage(1);
            }}
            isLoading={isSubLoading}
          />

          {/* Main Table / View */}
          {isError ? (
            <ErrorState
              title="Failed to Load Subscriptions"
              description="An error occurred while retrieving the subscriptions list. Please try again."
              retryAction={{
                label: "Retry",
                onClick: () => refetch(),
              }}
            />
          ) : isSubLoading ? (
            <SubscriptionTable
              columns={columns}
              data={[]}
              isLoading={true}
              onView={handleView}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onRedeem={handleRedeem}
              canView={canView}
              canEdit={canConfigure}
              canCancel={canConfigure}
              canRedeem={canRedeem}
              getBranchName={getBranchName}
            />
          ) : subscriptions.length === 0 ? (
            debouncedSearch.trim() || status !== "all" ? (
              <EmptyState
                icon={HelpCircle}
                title="No Matching Subscriptions"
                description="No subscriptions match your current filter criteria."
                action={{
                  label: "Reset Filters",
                  onClick: () => {
                    setSearch("");
                    setStatus("all");
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={Sparkles}
                title="No Subscriptions Active"
                description="Start assigning prepaid service packages and custom subscriptions to your customers."
                action={
                  canSell
                    ? {
                        label: "Sell First Subscription",
                        onClick: () => {
                          setSelectedPlanForCustomer(null);
                          setIsCreateOpen(true);
                        },
                        icon: Plus,
                      }
                    : undefined
                }
              />
            )
          ) : (
            <div className="space-y-4">
              <SubscriptionTable
                columns={columns}
                data={subscriptions}
                isLoading={false}
                onView={handleView}
                onEdit={handleEdit}
                onCancel={handleCancel}
                onRedeem={handleRedeem}
                canView={canView}
                canEdit={canConfigure}
                canCancel={canConfigure}
                canRedeem={canRedeem}
                getBranchName={getBranchName}
              />

              {meta && meta.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  totalItems={meta.total}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  itemLabel="subscriptions"
                />
              )}
            </div>
          )}
        </>
      ) : (
        /* Plan Templates Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
            <span>
              Pre-defined subscription packages with session quotas and default
              pricing. Staff can select these templates to quickly sell to
              customers with negotiated pricing.
            </span>
          </div>

          {isPlansError ? (
            <ErrorState
              title="Failed to Load Plans"
              description="An error occurred while retrieving plan templates."
              retryAction={{
                label: "Retry",
                onClick: () => refetchPlans(),
              }}
            />
          ) : isPlanLoading ? (
            <SubscriptionPlanTable
              plans={[]}
              isLoading={true}
              onEdit={() => {}}
              onDelete={() => {}}
              canConfigure={canConfigure}
            />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Subscription Plans Yet"
              description="Create reusable plan templates (e.g. Grooming Pass, Bridal Package) with bundled services and session allowances."
              action={
                canConfigure
                  ? {
                      label: "Create First Plan",
                      onClick: () => {
                        setActivePlan(null);
                        setIsPlanFormOpen(true);
                      },
                      icon: Plus,
                    }
                  : undefined
              }
            />
          ) : (
            <SubscriptionPlanTable
              plans={plans}
              isLoading={false}
              onEdit={(p) => {
                setActivePlan(p);
                setIsPlanFormOpen(true);
              }}
              onDelete={handleDeletePlan}
              onSelectForCustomer={
                canSell ? handleSelectPlanForCustomer : undefined
              }
              canConfigure={canConfigure}
            />
          )}
        </div>
      )}

      {/* Plan Create/Edit Dialog */}
      {isPlanFormOpen && (
        <Dialog
          isOpen={isPlanFormOpen}
          onClose={() => {
            setIsPlanFormOpen(false);
            setActivePlan(null);
          }}
          title={
            activePlan
              ? "Edit Subscription Plan Template"
              : "New Subscription Plan Template"
          }
        >
          <PlanFormDialog
            isOpen={isPlanFormOpen}
            onClose={() => {
              setIsPlanFormOpen(false);
              setActivePlan(null);
            }}
            onSubmit={handleCreatePlanSubmit}
            isLoading={
              createPlanMutation.isPending || updatePlanMutation.isPending
            }
            initialPlan={activePlan}
          />
        </Dialog>
      )}

      {/* Create Customer Subscription Dialog */}
      {isCreateOpen && (
        <Dialog
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setSelectedPlanForCustomer(null);
          }}
          title="Sell Customer Subscription"
        >
          <CreateSubscriptionDialog
            isOpen={isCreateOpen}
            onClose={() => {
              setIsCreateOpen(false);
              setSelectedPlanForCustomer(null);
            }}
            onSubmit={handleCreateSubmit}
            isLoading={createMutation.isPending}
            initialPlan={selectedPlanForCustomer}
          />
        </Dialog>
      )}

      {/* Edit Dialog */}
      {isEditOpen && activeSubscription && (
        <Dialog
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setActiveSubscription(null);
          }}
          title="Update Subscription"
        >
          <EditSubscriptionDialog
            subscription={activeSubscription}
            isOpen={isEditOpen}
            onClose={() => {
              setIsEditOpen(false);
              setActiveSubscription(null);
            }}
            onSubmit={handleEditSubmit}
            isLoading={updateMutation.isPending}
          />
        </Dialog>
      )}

      {/* Cancel Dialog */}
      {isCancelOpen && activeSubscription && (
        <Dialog
          isOpen={isCancelOpen}
          onClose={() => {
            setIsCancelOpen(false);
            setActiveSubscription(null);
          }}
          title="Cancel Subscription"
        >
          <CancelSubscriptionDialog
            subscription={activeSubscription}
            isOpen={isCancelOpen}
            onClose={() => {
              setIsCancelOpen(false);
              setActiveSubscription(null);
            }}
            onConfirm={handleCancelConfirm}
            isLoading={cancelMutation.isPending}
          />
        </Dialog>
      )}

      {/* Redeem Dialog */}
      {isRedeemOpen && activeSubscription && (
        <Dialog
          isOpen={isRedeemOpen}
          onClose={() => {
            setIsRedeemOpen(false);
            setActiveSubscription(null);
          }}
          title="Redeem Subscription Entitlements"
        >
          <RedeemSubscriptionModal
            subscription={activeSubscription}
            isOpen={isRedeemOpen}
            onClose={() => {
              setIsRedeemOpen(false);
              setActiveSubscription(null);
            }}
            onSuccess={() => {
              refetch();
            }}
          />
        </Dialog>
      )}

      {/* Renew Subscription Dialog */}
      {isRenewOpen && activeSubscription && (
        <Dialog
          isOpen={isRenewOpen}
          onClose={() => {
            setIsRenewOpen(false);
            setActiveSubscription(null);
          }}
          title="Renew Subscription"
        >
          <RenewSubscriptionDialog
            subscription={activeSubscription}
            isOpen={isRenewOpen}
            onClose={() => {
              setIsRenewOpen(false);
              setActiveSubscription(null);
            }}
            onSubmit={handleRenewSubmit}
            isLoading={renewMutation.isPending}
          />
        </Dialog>
      )}
    </div>
  );
}
