"use client";

import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import type { RootState } from "@/store";
import {
  setBasketCustomer,
  setBasketAppointment,
  addProductToBasket,
  addSubscriptionToBasket,
  addMembershipToBasket,
  addWalkinServiceToBasket,
  clearSaleBasket,
} from "@/store/slices/saleBasketSlice";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCheckoutQueue,
  useMembershipPlans,
} from "../hooks/useBillingQueries";
import { useCreateInvoice } from "../hooks/useBillingMutations";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import { useSubscriptionPlans } from "@/features/subscriptions/hooks/useSubscriptionPlans";
import {
  useProducts,
  useBranchStock,
} from "@/features/inventory/hooks/useInventory";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { SaleBasketPanel } from "./SaleBasketPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Calendar,
  Package,
  Sparkles,
  Crown,
  Scissors,
  User,
  Plus,
  Check,
  Clock,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useUpdateAppointmentStatus } from "@/features/appointments/hooks/useAppointmentMutations";
import { requiresSubscriptionVerification } from "@/features/appointments/utils/appointmentSubscription";
import { SubscriptionVerificationModal } from "@/features/appointments/components/SubscriptionVerificationModal";
import { SubscriptionPlanInfoModal } from "@/features/subscriptions/components/SubscriptionPlanInfoModal";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import type { Product } from "@/features/inventory/types/inventory.types";
import type { SubscriptionPlan } from "@/features/subscriptions/types/plan.types";
import type {
  Subscription,
  SubscriptionMember,
  SubscriptionEntitlement,
} from "@/features/subscriptions/types/subscription.types";
import type { Service } from "@/features/services/types/service.types";
import type { MembershipPlanItem } from "../api/billing.api";

type CatalogTab =
  | "appointments"
  | "products"
  | "services"
  | "subscriptions"
  | "memberships";

export function SalesWorkspaceView() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { currentBranchId, isAllBranchesSelected, getBranchName } =
    useBranchContext();
  const basket = useSelector((state: RootState) => state.saleBasket);

  const [activeTab, setActiveTab] = useState<CatalogTab>("appointments");
  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptionViewMode, setSubscriptionViewMode] = useState<
    "uninvoiced" | "catalog"
  >("uninvoiced");
  const [selectedSubForInfo, setSelectedSubForInfo] =
    useState<Subscription | null>(null);
  const [appointmentForSubVerification, setAppointmentForSubVerification] =
    useState<Appointment | null>(null);

  const updateStatusMutation = useUpdateAppointmentStatus();

  const currentCustomerId = basket.customer?.id;

  // 1. Data queries
  const { data: checkoutQueueData, isLoading: isQueueLoading } =
    useCheckoutQueue({
      branchId: currentBranchId || undefined,
      customerId: currentCustomerId || undefined,
    });

  const { data: inventoryData, isLoading: isInventoryLoading } = useProducts(
    activeTab === "products" &&
      Boolean(currentBranchId) &&
      !isAllBranchesSelected
      ? {
          page: 1,
          limit: 100,
          search: searchQuery || undefined,
        }
      : undefined,
  );

  const { data: servicesData, isLoading: isServicesLoading } = useServices(
    activeTab === "services" ? { page: 1, limit: 100 } : undefined,
  );

  const { data: subscriptionPlansData, isLoading: isSubPlansLoading } =
    useSubscriptionPlans(
      activeTab === "subscriptions" ? { limit: 100 } : undefined,
    );

  const { data: membershipPlansData, isLoading: isMemPlansLoading } =
    useMembershipPlans(currentBranchId || undefined);

  const { data: customersData } = useCustomers({ limit: 100 });

  const { data: stockData } = useBranchStock({
    branchId: currentBranchId || undefined,
    limit: 100,
  });

  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    const stockList = Array.isArray(stockData?.data) ? stockData.data : [];
    for (const b of stockList) {
      const pId =
        typeof b.productId === "object" && b.productId !== null
          ? (b.productId as { id?: string; _id?: string }).id ||
            (b.productId as { id?: string; _id?: string })._id
          : String(b.productId || "");
      if (pId) {
        const onHand = typeof b.onHand === "number" ? b.onHand : 0;
        const allocated = typeof b.allocated === "number" ? b.allocated : 0;
        const avail = Math.max(0, onHand - allocated);
        map.set(pId, avail);
      }
    }
    return map;
  }, [stockData]);

  // Fetch sold subscriptions that have not yet had an invoice generated
  const { data: uninvoicedSubsData, isLoading: isUninvoicedSubsLoading } =
    useSubscriptions(
      {
        isInvoiced: "false",
        customerId: currentCustomerId || undefined,
        limit: 50,
      },
      {
        enabled:
          activeTab === "subscriptions" && Boolean(currentCustomerId),
      },
    );
  const { data: customerSubsData } = useSubscriptions(
    { customerId: currentCustomerId || undefined, limit: 50 },
    { enabled: Boolean(currentCustomerId) },
  );

  const activeSubscriptions: Subscription[] = useMemo(() => {
    return (customerSubsData?.data || []).filter((sub: Subscription) => {
      return sub.status === "active" || sub.status === "pending_payment";
    });
  }, [customerSubsData?.data]);

  const subscriptionsByService = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        subscriptionId: string;
        subscriptionCode: string;
        remaining: number;
        total: number;
      }>
    >();

    for (const sub of activeSubscriptions) {
      const members = sub.members;
      const hasMembersArray = Array.isArray(members);
      const memberEntry = hasMembersArray
        ? members.find(
            (m: SubscriptionMember) => m.customerId === currentCustomerId,
          )
        : undefined;

      if (hasMembersArray && !memberEntry) continue;

      if (
        currentBranchId &&
        sub.permittedBranchIds &&
        sub.permittedBranchIds.length > 0 &&
        !sub.permittedBranchIds.includes(currentBranchId)
      ) {
        continue;
      }

      const candidateEntitlements: SubscriptionEntitlement[] = memberEntry
        ? memberEntry.entitlements || []
        : sub.entitlements || [];

      for (const ent of candidateEntitlements) {
        if (ent.remainingQuantity > 0 && ent.isRedeemable !== false) {
          const list = map.get(ent.serviceId) || [];
          list.push({
            subscriptionId: sub.id || sub._id || "",
            subscriptionCode: sub.subscriptionCode,
            remaining: ent.remainingQuantity,
            total: ent.totalQuantity,
          });
          map.set(ent.serviceId, list);
        }
      }
    }
    return map;
  }, [activeSubscriptions, currentCustomerId, currentBranchId]);

  const subscribedServiceIds = useMemo(() => {
    const set = new Set<string>();
    subscriptionsByService.forEach((candidates, sId) => {
      if (candidates.some((c) => c.remaining > 0)) {
        set.add(sId);
      }
    });
    return set;
  }, [subscriptionsByService]);

  const [selectedServiceCategory, setSelectedServiceCategory] =
    useState<string>("all");
  const { data: categoriesData } = useServiceCategories();
  const serviceCategories = useMemo(() => {
    return Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  }, [categoriesData]);

  // 2. Filtered appointments (scoped strictly to current selected customer when chosen)
  const appointments: Appointment[] = useMemo(() => {
    let list: Appointment[] = Array.isArray(checkoutQueueData)
      ? checkoutQueueData
      : [];

    if (currentCustomerId) {
      list = list.filter((apt: Appointment) => {
        const aptCustId = apt.customerId || apt.customer?.id;
        return String(aptCustId) === String(currentCustomerId);
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (apt: Appointment) =>
        (apt.customer?.name || "").toLowerCase().includes(q) ||
        (apt.appointmentCode || "").toLowerCase().includes(q) ||
        (apt.customer?.phone || "").includes(q),
    );
  }, [checkoutQueueData, currentCustomerId, searchQuery]);

  // 3. Filtered products (only retail_sale or both AND strictly in stock)
  const retailProducts: Product[] = useMemo(() => {
    const list: Product[] = Array.isArray(inventoryData?.data)
      ? inventoryData.data
      : [];
    return list.filter((p: Product) => {
      if (
        p.status !== "active" ||
        !["retail_sale", "both"].includes(p.usageType)
      ) {
        return false;
      }
      // Strictly only show in-stock products
      const avail = stockMap.get(p.id) ?? 0;
      if (avail <= 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    });
  }, [inventoryData, stockMap, searchQuery]);

  // 4. Create Invoice mutation
  const createInvoiceMutation = useCreateInvoice();

  // Handle appointment selection
  const handleSelectAppointment = (apt: Appointment) => {
    const cust = {
      id: apt.customerId || apt.customer?.id || "",
      name: apt.customer?.name || "Walk-in Customer",
      phone: apt.customer?.phone || "",
      email: apt.customer?.email || null,
    };

    const appointmentCode =
      apt.appointmentCode || apt.id.slice(-6).toUpperCase();

    const services = (apt.services || []).map((s) => {
      let subCode = s.subscriptionCode || null;
      let appliedSubId = s.appliedSubscriptionId || null;

      // If missing subCode, attempt lookup via appliedSubscriptionId
      if (!subCode && appliedSubId) {
        const foundSub = (customerSubsData?.data || []).find(
          (sub: Subscription) => (sub.id || sub._id) === appliedSubId,
        );
        if (foundSub?.subscriptionCode) {
          subCode = foundSub.subscriptionCode;
        }
      }

      // If still missing but covered, or service matches active customer subscription quota
      if (!subCode && s.serviceId) {
        const candidates = subscriptionsByService.get(s.serviceId) || [];
        const topCandidate = candidates.find((c) => c.remaining > 0);
        if (topCandidate) {
          subCode = topCandidate.subscriptionCode;
          if (!appliedSubId) {
            appliedSubId = topCandidate.subscriptionId;
          }
        }
      }

      const isCovered = Boolean(
        appliedSubId ||
          s.appliedSubscriptionId ||
          s.subscriptionUsageId ||
          subCode,
      );

      return {
        appointmentId: apt.id,
        appointmentCode,
        serviceId: s.serviceId || undefined,
        name: s.name,
        duration: s.duration,
        unitPrice: s.price,
        quantity: 1,
        isCoveredBySubscription: isCovered,
        appliedSubscriptionId: appliedSubId,
        subscriptionCode: subCode,
      };
    });

    // Check if appointment already has an active draft invoice
    const aptWithInvoice = apt as Appointment & {
      invoiceId?: string;
      invoiceNumber?: string;
    };
    const existingDraft = aptWithInvoice.invoiceId
      ? {
          id: aptWithInvoice.invoiceId,
          invoiceNumber: aptWithInvoice.invoiceNumber || "DRAFT",
        }
      : null;

    dispatch(
      setBasketAppointment({
        appointmentId: apt.id,
        appointmentCode,
        customer: cust,
        services,
        existingDraftInvoice: existingDraft,
      }),
    );
    toast.success(
      `Appointment #${apt.appointmentCode} loaded into sale basket.`,
    );
  };

  // Handle separate invoice directly from appointment
  const handleDirectSeparateAppointmentInvoice = async (apt: Appointment) => {
    if (!currentBranchId || isAllBranchesSelected) {
      toast.error("Please select a specific branch before invoicing");
      return;
    }
    if (apt.status !== "completed") {
      toast.error(
        "Cannot create invoice: appointment is still in progress. Please complete it first.",
      );
      return;
    }
    try {
      const result = await createInvoiceMutation.mutateAsync({
        branchId: currentBranchId,
        appointmentId: apt.id,
        customerId: apt.customerId || apt.customer?.id,
      });
      toast.success(`Separate draft invoice #${result.invoiceNumber} created!`);
      router.push(`/billing/${result.id}`);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (axiosError.response?.status === 409) {
        toast.error(
          "This subscription entitlement was recently used by another terminal. Refreshing draft and subscription balances...",
          { duration: 6000 },
        );
        // Invalidate subscriptions and checkout-queue queries to reflect latest server-authoritative entitlements
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return (
              key === "subscriptions" ||
              key === "checkout-queue" ||
              key === "invoices"
            );
          },
        });
        return;
      }

      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice",
      );
    }
  };

  // Complete an in-progress appointment so it is ready for checkout
  const handleCompleteAppointment = async (apt: Appointment) => {
    const effectiveBranchId =
      apt.branchId ||
      apt.branch?.id ||
      (currentBranchId && currentBranchId !== "all" ? currentBranchId : "");

    if (!effectiveBranchId) {
      toast.error("Branch ID could not be identified for this appointment.");
      return;
    }

    if (requiresSubscriptionVerification(apt)) {
      setAppointmentForSubVerification({
        ...apt,
        branchId: effectiveBranchId,
      });
    } else {
      try {
        await updateStatusMutation.mutateAsync({
          id: apt.id,
          payload: {
            branchId: effectiveBranchId,
            status: "completed",
          },
        });
        toast.success(
          `Appointment #${apt.appointmentCode} completed. Action buttons are now active.`,
        );
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        toast.error(
          axiosError.response?.data?.message ||
            axiosError.message ||
            "Failed to complete appointment.",
        );
      }
    }
  };

  // Handle product add
  const handleAddProduct = (prod: Product) => {
    if (!basket.customer) {
      toast.error("Please select a customer or appointment first.");
      return;
    }
    dispatch(
      addProductToBasket({
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        unitPrice: prod.sellingPrice || 0,
        quantity: 1,
        stockUnit: prod.stockUnit,
      }),
    );
    toast.success(`Added ${prod.name} to basket.`);
  };

  // Handle sold subscription add (pending invoice)
  const handleAddSoldSubscription = (sub: Subscription) => {
    // If basket doesn't have customer set, auto-set to subscription customer
    if (!basket.customer) {
      const custObj =
        typeof sub.customerId === "object" && sub.customerId !== null
          ? sub.customerId
          : typeof sub.payerCustomerId === "object" &&
              sub.payerCustomerId !== null
            ? sub.payerCustomerId
            : null;
      if (custObj && (custObj as { id?: string; _id?: string }).id) {
        const c = custObj as {
          id?: string;
          _id?: string;
          name: string;
          phone: string;
          email?: string;
        };
        dispatch(
          setBasketCustomer({
            id: c.id || c._id || "",
            name: c.name,
            phone: c.phone,
            email: c.email,
          }),
        );
      } else {
        toast.error("Please select a customer or appointment first.");
        return;
      }
    }
    dispatch(
      addSubscriptionToBasket({
        planId: sub.planId ? String(sub.planId) : sub.id,
        subscriptionId: sub.id,
        name: `Subscription (${sub.subscriptionCode})`,
        suggestedPrice: sub.price,
      }),
    );
    toast.success(`Added subscription ${sub.subscriptionCode} to basket.`);
  };

  // Direct separate invoice for sold subscription
  const handleDirectSeparateSubscriptionInvoice = async (sub: Subscription) => {
    if (!currentBranchId || isAllBranchesSelected) {
      toast.error("Please select a specific branch before invoicing");
      return;
    }
    try {
      const payerId =
        typeof sub.payerCustomerId === "object" && sub.payerCustomerId !== null
          ? (sub.payerCustomerId as { id?: string; _id?: string }).id ||
            (sub.payerCustomerId as { id?: string; _id?: string })._id
          : typeof sub.customerId === "object" && sub.customerId !== null
            ? (sub.customerId as { id?: string; _id?: string }).id ||
              (sub.customerId as { id?: string; _id?: string })._id
            : String(sub.payerCustomerId || sub.customerId || "");

      const result = await createInvoiceMutation.mutateAsync({
        branchId: currentBranchId,
        subscriptionId: sub.id,
        customerId: payerId,
      });
      toast.success(`Separate draft invoice #${result.invoiceNumber} created!`);
      router.push(`/billing/${result.id}`);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (axiosError.response?.status === 409) {
        toast.error(
          "This subscription entitlement was recently used by another terminal. Refreshing draft and subscription balances...",
          { duration: 6000 },
        );
        // Invalidate subscriptions and checkout-queue queries to reflect latest server-authoritative entitlements
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return (
              key === "subscriptions" ||
              key === "checkout-queue" ||
              key === "invoices"
            );
          },
        });
        return;
      }

      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice",
      );
    }
  };

  // Handle subscription add
  const handleAddSubscription = (plan: SubscriptionPlan) => {
    if (!basket.customer) {
      toast.error("Please select a customer or appointment first.");
      return;
    }
    dispatch(
      addSubscriptionToBasket({
        planId: plan.id,
        name: plan.name,
        suggestedPrice: plan.suggestedPrice,
        validityMonths: plan.validityMonths,
        entitlements: plan.entitlements,
      }),
    );
    toast.success(`Added ${plan.name} to basket.`);
  };

  // Handle membership add
  const handleAddMembership = (plan: MembershipPlanItem) => {
    if (!basket.customer) {
      toast.error("Please select a customer or appointment first.");
      return;
    }
    dispatch(
      addMembershipToBasket({
        membershipPlanId: plan._id,
        name: plan.name,
        code: plan.code,
        tier: plan.tier || "Standard",
        price: plan.price,
        serviceDiscountPercentage:
          plan.benefits?.serviceDiscountPercentage || 0,
        productDiscountPercentage:
          plan.benefits?.productDiscountPercentage || 0,
      }),
    );
    toast.success(`Enrolled ${plan.name} in basket.`);
  };

  // Handle walkin service add
  const handleAddWalkinService = (svc: Service) => {
    if (!basket.customer) {
      toast.error("Please select a customer or appointment first.");
      return;
    }
    const subCandidates = subscriptionsByService.get(svc.id) || [];
    const hasRemainingQuota = subCandidates.some((c) => c.remaining > 0);
    const topCandidate = subCandidates.find((c) => c.remaining > 0);

    dispatch(
      addWalkinServiceToBasket({
        serviceId: svc.id,
        name: svc.name,
        duration: svc.duration,
        unitPrice: svc.pricing?.basePrice || 0,
        quantity: 1,
        isCoveredBySubscription: hasRemainingQuota,
        appliedSubscriptionId: hasRemainingQuota
          ? topCandidate?.subscriptionId
          : null,
        subscriptionCode: hasRemainingQuota
          ? topCandidate?.subscriptionCode
          : null,
      }),
    );
    if (hasRemainingQuota) {
      toast.success(
        `Added ${svc.name} to basket (covered by subscription ${topCandidate?.subscriptionCode || ""}).`,
      );
    } else {
      toast.success(`Added ${svc.name} to basket.`);
    }
  };

  // Customer picker selector
  const handleSelectCustomer = (customerId: string) => {
    const list = Array.isArray(customersData?.data) ? customersData.data : [];
    const found = list.find((c: { id: string }) => c.id === customerId);
    if (found) {
      dispatch(
        setBasketCustomer({
          id: found.id,
          name: found.name,
          phone: found.phone,
          email: found.email,
        }),
      );
      toast.success(`Customer set to ${found.name}`);
    }
  };

  // Finalize / Generate Draft Invoice via Authoritative Backend
  const handleCheckoutSubmit = async () => {
    if (!currentBranchId || isAllBranchesSelected) {
      toast.error("Please select a specific branch before creating an invoice");
      return;
    }
    if (!basket.customer) {
      toast.error("Customer is required");
      return;
    }

    try {
      const existingSubscriptionItem = basket.subscriptionLines.find((s) =>
        Boolean(s.subscriptionId),
      );
      const catalogSubLines = basket.subscriptionLines
        .filter((s) => !s.subscriptionId)
        .map((s) => ({ planId: s.planId }));

      const payload = {
        branchId: currentBranchId,
        customerId: basket.customer.id,
        appointmentId: basket.appointment?.appointmentId || undefined,
        subscriptionId: existingSubscriptionItem?.subscriptionId || undefined,
        productLines: basket.productLines.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
        })),
        subscriptionLines: catalogSubLines,
        membershipLines: basket.membershipLines.map((m) => ({
          membershipPlanId: m.membershipPlanId,
          quantity: 1,
        })),
        serviceLines: basket.walkinServiceLines.map((s) => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
          appliedSubscriptionId: s.isCoveredBySubscription
            ? s.appliedSubscriptionId || undefined
            : undefined,
        })),
        discountTotal:
          basket.discountTotal > 0 ? basket.discountTotal : undefined,
        redeemLoyaltyPoints:
          basket.redeemLoyaltyPoints > 0
            ? basket.redeemLoyaltyPoints
            : undefined,
        notes: basket.notes || undefined,
      };

      const result = await createInvoiceMutation.mutateAsync(payload);
      toast.success(`Invoice #${result.invoiceNumber} generated successfully!`);
      dispatch(clearSaleBasket());
      router.push(`/billing/${result.id}`);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };

      if (axiosError.response?.status === 409) {
        toast.error(
          "This subscription entitlement was recently used by another terminal. Refreshing draft and subscription balances...",
          { duration: 6000 },
        );
        // Invalidate subscriptions and checkout-queue queries to reflect latest server-authoritative entitlements
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return (
              key === "subscriptions" ||
              key === "checkout-queue" ||
              key === "invoices"
            );
          },
        });
        return;
      }

      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice",
      );
    }
  };

  if (!currentBranchId || isAllBranchesSelected) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Calendar className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Specific Branch Required
        </h2>
        <p className="text-xs text-muted-foreground">
          Sales billing requires an active branch context to guarantee inventory
          ledger isolation and sequence numbering. Please select a branch from
          the top switcher.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col md:flex-row overflow-hidden bg-background">
      {/* LEFT 65%: Multi-Source Catalog & Selection Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 border-r border-border">
        {/* Top Header & Customer Context */}
        <div className="p-4 border-b border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Unified Sales Workspace
            </h1>
            <p className="text-xs text-muted-foreground">
              Branch:{" "}
              <span className="font-semibold text-foreground">
                {getBranchName(currentBranchId)}
              </span>
            </p>
          </div>

          {/* Quick Customer Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Customer:
            </span>
            <select
              value={basket.customer?.id || ""}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="h-8 text-xs border border-border rounded-md px-2 bg-background font-medium focus:ring-1 focus:ring-primary w-48"
            >
              <option value="">-- Choose Customer --</option>
              {Array.isArray(customersData?.data) &&
                customersData.data.map(
                  (c: { id: string; name: string; phone: string }) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ),
                )}
            </select>
          </div>
        </div>

        {/* Source Navigation Tabs & Search */}
        <div className="px-4 py-2 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <Button
              variant={activeTab === "appointments" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("appointments")}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Calendar className="h-3.5 w-3.5" />
              Appointments
              {appointments.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-[10px] ml-1"
                >
                  {appointments.length}
                </Badge>
              )}
            </Button>

            <Button
              variant={activeTab === "products" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("products")}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Package className="h-3.5 w-3.5" />
              Retail Products
            </Button>

            <Button
              variant={activeTab === "services" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("services")}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Scissors className="h-3.5 w-3.5" />
              Walk-in Services
            </Button>

            <Button
              variant={activeTab === "subscriptions" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("subscriptions")}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Subscriptions
            </Button>

            <Button
              variant={activeTab === "memberships" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("memberships")}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Crown className="h-3.5 w-3.5" />
              Memberships
            </Button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 1. Appointments Source */}
          {activeTab === "appointments" && (
            <div className="space-y-3">
              {isQueueLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading queue...
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  {currentCustomerId
                    ? `No appointments ready for billing for this customer.`
                    : `No appointments ready for billing at this branch.`}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {appointments.map((apt) => {
                    const aptWithInvoice = apt as Appointment & {
                      invoiceId?: string;
                      invoiceNumber?: string;
                    };
                    const isSelected =
                      basket.appointment?.appointmentId === apt.id;
                    const hasDraft = Boolean(aptWithInvoice.invoiceId);
                    const isCompleted = apt.status === "completed";

                    return (
                      <div
                        key={apt.id}
                        className={`p-3 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : isCompleted
                              ? "border-emerald-500/30 bg-card hover:border-emerald-500/60"
                              : "border-border/80 bg-muted/20 opacity-90"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-foreground">
                            #{apt.appointmentCode}
                          </span>
                          <div className="flex items-center gap-1">
                            {hasDraft && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-700 border-amber-300"
                              >
                                Draft Exists
                              </Badge>
                            )}
                            <Badge
                              variant={isCompleted ? "default" : "secondary"}
                              className={`capitalize text-[10px] ${
                                isCompleted
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {isCompleted
                                ? "Completed"
                                : "In Progress (In Chair)"}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {apt.customer?.name} ({apt.customer?.phone})
                          </div>
                          <div className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {apt.startTime
                              ? formatDate(apt.startTime)
                              : "Today"}
                          </div>
                          <div className="text-foreground/80 text-[11px] truncate">
                            Services:{" "}
                            {(apt.services || []).map((s) => s.name).join(", ")}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {formatCurrency(apt.pricing?.total || 0)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {!isCompleted ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleCompleteAppointment(apt)}
                                disabled={updateStatusMutation.isPending}
                                className="h-7 text-[11px] px-2.5 gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs font-semibold"
                                title="Appointment must be completed before invoicing"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Complete Booking</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDirectSeparateAppointmentInvoice(apt)
                                  }
                                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                >
                                  Bill Separate
                                </Button>
                                <Button
                                  variant={isSelected ? "secondary" : "default"}
                                  size="sm"
                                  onClick={() => handleSelectAppointment(apt)}
                                  className="h-7 text-[11px] px-2.5 gap-1"
                                >
                                  {isSelected ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      <span>In Basket</span>
                                    </>
                                  ) : hasDraft ? (
                                    <span>Resume Draft</span>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" />
                                      <span>Add to Basket</span>
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Retail Products Source */}
          {activeTab === "products" && (
            <div className="space-y-3">
              {isInventoryLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading products...
                </div>
              ) : retailProducts.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No retail products available for sale in this branch.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {retailProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-lg border border-border bg-card text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="font-semibold text-foreground truncate">
                          {prod.name}
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          SKU: {prod.sku} | Unit: {prod.stockUnit}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sm text-foreground">
                          {formatCurrency(prod.sellingPrice || 0)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddProduct(prod)}
                          className="h-7 text-[11px] px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Walk-in Services Source */}
          {activeTab === "services" && (
            <div className="space-y-3">
              {/* Category Pills & Subscribed Quick Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedServiceCategory("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                    selectedServiceCategory === "all"
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  All Services
                </button>

                {/* Subscribed Services Filter Pill */}
                {subscribedServiceIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedServiceCategory("subscribed")}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1 ${
                      selectedServiceCategory === "subscribed"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                    }`}
                    title="View services covered by active customer subscription"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Subscribed ({subscribedServiceIds.size})
                  </button>
                )}

                {serviceCategories.map(
                  (cat: { id?: string; _id?: string; name: string }) => {
                    const catId = cat.id || cat._id || "";
                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => setSelectedServiceCategory(catId)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                          selectedServiceCategory === catId
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  },
                )}
              </div>

              {/* Subscribed Banner if customer has subscriptions and not filtered to subscribed */}
              {subscribedServiceIds.size > 0 &&
                selectedServiceCategory !== "subscribed" && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                        Customer has {subscribedServiceIds.size} service(s)
                        covered under active subscription plans.
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedServiceCategory("subscribed")}
                      className="h-6 text-[11px] px-2 text-emerald-700 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                      Show Subscribed
                    </Button>
                  </div>
                )}

              {isServicesLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading services...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.isArray(servicesData?.data) &&
                    servicesData.data
                      .filter((svc: Service) => {
                        if (selectedServiceCategory === "subscribed") {
                          return subscribedServiceIds.has(svc.id);
                        }
                        if (selectedServiceCategory !== "all") {
                          const catId =
                            typeof svc.categoryId === "object"
                              ? svc.categoryId?._id
                              : svc.categoryId;
                          return catId === selectedServiceCategory;
                        }
                        return true;
                      })
                      .map((svc: Service) => {
                        const subCandidates =
                          subscriptionsByService.get(svc.id) || [];
                        const hasSub = subCandidates.some(
                          (c) => c.remaining > 0,
                        );
                        const totalRemaining = subCandidates.reduce(
                          (s, c) => s + c.remaining,
                          0,
                        );

                        return (
                          <div
                            key={svc.id}
                            className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                              hasSub
                                ? "border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                                : "border-border bg-card"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground truncate">
                                  {svc.name}
                                </span>
                                {hasSub && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-1 py-0 font-bold whitespace-nowrap"
                                  >
                                    <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" />
                                    Quota ({totalRemaining})
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Duration: {svc.duration || 30} mins
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-sm text-foreground">
                                {formatCurrency(svc.pricing?.basePrice || 0)}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddWalkinService(svc)}
                                className="h-7 text-[11px] px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                </div>
              )}
            </div>
          )}

          {/* 4. Subscriptions Source */}
          {activeTab === "subscriptions" && (
            <div className="space-y-4">
              {/* Mode Switcher: Sold (Uninvoiced) Subscriptions vs Subscription Catalog Plans */}
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    subscriptionViewMode === "uninvoiced"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setSubscriptionViewMode("uninvoiced")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sold Subscriptions (Pending Invoice)
                  {currentCustomerId &&
                    Array.isArray(uninvoicedSubsData?.data) &&
                    uninvoicedSubsData.data.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[10px] ml-1"
                      >
                        {uninvoicedSubsData.data.length}
                      </Badge>
                    )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={
                    subscriptionViewMode === "catalog" ? "default" : "outline"
                  }
                  onClick={() => setSubscriptionViewMode("catalog")}
                  className="h-8 text-xs gap-1.5"
                >
                  <Package className="h-3.5 w-3.5" />
                  Subscription Plans Catalog
                </Button>
              </div>

              {/* Sub-view 1: Uninvoiced Subscriptions */}
              {subscriptionViewMode === "uninvoiced" && (
                <div className="space-y-3">
                  {!currentCustomerId ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      Select a customer to view their sold subscriptions.
                    </div>
                  ) : isUninvoicedSubsLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Loading uninvoiced subscriptions...
                    </div>
                  ) : !Array.isArray(uninvoicedSubsData?.data) ||
                    uninvoicedSubsData.data.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No pending subscriptions found waiting for invoice
                      generation.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {uninvoicedSubsData.data.map((sub: Subscription) => {
                        const isSubInBasket = basket.subscriptionLines.some(
                          (l) => l.subscriptionId === sub.id,
                        );
                        const customerName =
                          sub.customer?.name ||
                          (typeof sub.customerId === "object" &&
                          sub.customerId !== null
                            ? (sub.customerId as { name?: string }).name
                            : "Customer");
                        const customerPhone =
                          sub.customer?.phone ||
                          (typeof sub.customerId === "object" &&
                          sub.customerId !== null
                            ? (sub.customerId as { phone?: string }).phone
                            : "");

                        return (
                          <div
                            key={sub.id}
                            className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                              isSubInBasket
                                ? "border-purple-500 bg-purple-500/5 ring-1 ring-purple-500"
                                : "border-purple-200 dark:border-purple-900/50 bg-card"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                                    {sub.subscriptionCode}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedSubForInfo(sub)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-500/10 rounded-md"
                                    title="View Subscription Package & Plan Details"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span className="sr-only">View Details</span>
                                  </Button>
                                </div>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40"
                                >
                                  Uninvoiced
                                </Badge>
                              </div>

                              <div className="mt-2 space-y-1">
                                <div className="font-semibold text-foreground flex items-center gap-1.5">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {customerName}{" "}
                                  {customerPhone ? `(${customerPhone})` : ""}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  Entitlements: {sub.entitlements?.length || 0}{" "}
                                  service package sessions
                                </div>
                                {sub.notes && (
                                  <p className="text-[11px] text-muted-foreground italic truncate">
                                    &ldquo;{sub.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-sm text-foreground">
                                {formatCurrency(sub.price)}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleDirectSeparateSubscriptionInvoice(sub)
                                  }
                                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                >
                                  Bill Separate
                                </Button>

                                <Button
                                  variant={
                                    isSubInBasket ? "secondary" : "default"
                                  }
                                  size="sm"
                                  onClick={() => handleAddSoldSubscription(sub)}
                                  className="h-7 text-[11px] px-2.5 gap-1"
                                >
                                  {isSubInBasket ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      <span>In Basket</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" />
                                      <span>Add to Basket</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view 2: Subscription Plans Catalog */}
              {subscriptionViewMode === "catalog" && (
                <div className="space-y-3">
                  {isSubPlansLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Loading subscription plans...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Array.isArray(subscriptionPlansData?.data) &&
                        subscriptionPlansData.data.map(
                          (plan: SubscriptionPlan) => (
                            <div
                              key={plan.id}
                              className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/50 bg-card text-xs flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-purple-700 dark:text-purple-300">
                                    {plan.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {plan.validityMonths} Mo Validity
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                  {plan.description}
                                </p>
                                <div className="text-[11px] text-muted-foreground mt-1">
                                  Entitlements: {plan.entitlements?.length || 0}{" "}
                                  service package sessions
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-sm text-foreground">
                                  {formatCurrency(plan.suggestedPrice)}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddSubscription(plan)}
                                  className="h-7 text-[11px] px-2.5 gap-1 text-purple-700 border-purple-300 hover:bg-purple-50"
                                >
                                  <Plus className="h-3 w-3" /> Add Plan
                                </Button>
                              </div>
                            </div>
                          ),
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. Memberships Source */}
          {activeTab === "memberships" && (
            <div className="space-y-3">
              {isMemPlansLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading membership plans...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.isArray(membershipPlansData) &&
                    membershipPlansData.map((plan: MembershipPlanItem) => (
                      <div
                        key={plan._id}
                        className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-card text-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                              <Crown className="h-3.5 w-3.5" />
                              {plan.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-700 border-amber-300"
                            >
                              {plan.tier || "Standard"} Tier
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                            <div>
                              • {plan.benefits?.serviceDiscountPercentage}% OFF
                              Salon Services
                            </div>
                            <div>
                              • {plan.benefits?.productDiscountPercentage}% OFF
                              Retail Products
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {formatCurrency(plan.price)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddMembership(plan)}
                            className="h-7 text-[11px] px-2.5 gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            <Plus className="h-3 w-3" /> Enroll
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT 35%: Persistent Sale Basket Panel */}
      <div className="w-full md:w-95 lg:w-105 h-full shrink-0">
        <SaleBasketPanel
          onCheckout={handleCheckoutSubmit}
          isSubmitting={createInvoiceMutation.isPending}
        />
      </div>

      {/* Subscription OTP / Manual Verification Modal */}
      {appointmentForSubVerification && (
        <SubscriptionVerificationModal
          appointment={appointmentForSubVerification}
          isOpen={Boolean(appointmentForSubVerification)}
          onClose={() => setAppointmentForSubVerification(null)}
          onSuccess={() => {
            setAppointmentForSubVerification(null);
            toast.success("Subscription verified and appointment completed.");
          }}
        />
      )}

      {/* Subscription Plan & Entitlements Info Modal */}
      {selectedSubForInfo && (
        <SubscriptionPlanInfoModal
          subscription={selectedSubForInfo}
          isOpen={Boolean(selectedSubForInfo)}
          onClose={() => setSelectedSubForInfo(null)}
          getBranchName={getBranchName}
        />
      )}
    </div>
  );
}
