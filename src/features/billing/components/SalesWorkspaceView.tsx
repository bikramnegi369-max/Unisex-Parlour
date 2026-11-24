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
  recalculateSubscriptionCoverage,
  clearSaleBasket,
} from "@/store/slices/saleBasketSlice";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCheckoutQueue,
  useMembershipPlans,
} from "../hooks/useBillingQueries";
import {
  useCustomerMemberships,
  useSellMembership,
  useCreateMembershipPlan,
  useMembershipPlans as useCanonicalMembershipPlans,
} from "@/features/memberships/hooks/useMemberships";
import { useCreateSubscription } from "@/features/subscriptions/hooks/useCreateSubscription";
import { buildSubscriptionPurchasePayload } from "@/features/subscriptions/utils/buildSubscriptionPurchasePayload";
import { SellMembershipDialog } from "@/features/memberships/components/SellMembershipDialog";
import { CreateSubscriptionDialog } from "@/features/subscriptions/components/CreateSubscriptionDialog";
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
import { Dialog } from "@/components/ui/dialog";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useUpdateAppointmentStatus } from "@/features/appointments/hooks/useAppointmentMutations";
import { requiresSubscriptionVerification } from "@/features/appointments/utils/appointmentSubscription";
import { SubscriptionVerificationModal } from "@/features/appointments/components/SubscriptionVerificationModal";
import { SubscriptionPlanInfoModal } from "@/features/subscriptions/components/SubscriptionPlanInfoModal";
import { CustomerMembershipDetailsModal } from "@/features/memberships/components/CustomerMembershipDetailsModal";
import { CustomerSelector } from "@/features/customers/components/CustomerSelector";
import { AppointmentDetailsDialog } from "@/features/appointments/components/AppointmentDetailsDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Customer } from "@/features/customers/types/customer.types";
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
import type { CustomerMembership } from "@/features/memberships/types/membership.types";

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
  const { user } = useAuth();

  const canEditAppointments = hasPermission(user, "appointments.edit");
  const canStatusAppointments = hasPermission(
    user,
    "appointments.update_status",
  );
  const canDeleteAppointments = hasPermission(user, "appointments.delete");

  const [activeTab, setActiveTab] = useState<CatalogTab>("appointments");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] =
    useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] =
    useState(false);
  const [subscriptionViewMode, setSubscriptionViewMode] = useState<
    "uninvoiced" | "catalog"
  >("uninvoiced");
  const [membershipViewMode, setMembershipViewMode] = useState<
    "pending" | "catalog"
  >("pending");
  const [selectedSubForInfo, setSelectedSubForInfo] =
    useState<Subscription | null>(null);
  const [selectedMemForInfo, setSelectedMemForInfo] =
    useState<CustomerMembership | null>(null);
  const [appointmentForSubVerification, setAppointmentForSubVerification] =
    useState<Appointment | null>(null);

  // Modal states for full enrollment workflows
  const [isSellMembershipOpen, setIsSellMembershipOpen] = useState(false);
  const [selectedPlanIdForSellMembership, setSelectedPlanIdForSellMembership] =
    useState<string | null>(null);
  const [isSellSubscriptionOpen, setIsSellSubscriptionOpen] = useState(false);
  const [selectedPlanForSellSubscription, setSelectedPlanForSellSubscription] =
    useState<SubscriptionPlan | null>(null);

  const updateStatusMutation = useUpdateAppointmentStatus();
  const sellMembershipMutation = useSellMembership();
  const createMembershipPlanMutation = useCreateMembershipPlan();
  const createSubMutation = useCreateSubscription();

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

  const { data: canonicalMembershipPlansData } = useCanonicalMembershipPlans({
    limit: 100,
  });

  const canonicalPlans = useMemo(() => {
    return Array.isArray(canonicalMembershipPlansData?.data)
      ? canonicalMembershipPlansData.data
      : [];
  }, [canonicalMembershipPlansData]);

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
        enabled: activeTab === "subscriptions" && Boolean(currentCustomerId),
      },
    );

  // Fetch sold memberships awaiting invoice / payment for the selected customer
  const {
    data: pendingMembershipsData,
    isLoading: isPendingMembershipsLoading,
  } = useCustomerMemberships(
    {
      customerId: currentCustomerId || undefined,
      status: "pending_payment",
      limit: 50,
    },
    {
      enabled: activeTab === "memberships" && Boolean(currentCustomerId),
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

  // Automatically synchronize subscription coverage in the basket whenever customer subscriptions update
  React.useEffect(() => {
    if (
      activeSubscriptions.length > 0 &&
      (basket.walkinServiceLines.length > 0 ||
        basket.appointmentLines.length > 0)
    ) {
      dispatch(
        recalculateSubscriptionCoverage({
          subscriptions: activeSubscriptions.map((s) => ({
            id: s.id || s._id || "",
            subscriptionCode: s.subscriptionCode,
            entitlements: (s.entitlements || []).map((e) => ({
              serviceId: e.serviceId,
              remainingQuantity: e.remainingQuantity,
            })),
          })),
        }),
      );
    }
  }, [
    activeSubscriptions,
    basket.appointmentLines.length,
    basket.walkinServiceLines.length,
    dispatch,
  ]);

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
        categoryId: s.category || undefined,
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

    // Immediately evaluate and cover eligible services in basket using this subscription's entitlements
    if (Array.isArray(sub.entitlements) && sub.entitlements.length > 0) {
      dispatch(
        recalculateSubscriptionCoverage({
          subscriptions: [
            {
              id: sub.id,
              subscriptionCode: sub.subscriptionCode,
              entitlements: sub.entitlements.map((e) => ({
                serviceId: e.serviceId,
                remainingQuantity: e.remainingQuantity,
              })),
            },
            ...activeSubscriptions.map((s) => ({
              id: s.id || s._id || "",
              subscriptionCode: s.subscriptionCode,
              entitlements: (s.entitlements || []).map((e) => ({
                serviceId: e.serviceId,
                remainingQuantity: e.remainingQuantity,
              })),
            })),
          ],
        }),
      );
    }

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

    // Immediately evaluate and cover eligible services in basket using this plan's entitlements
    if (Array.isArray(plan.entitlements) && plan.entitlements.length > 0) {
      dispatch(
        recalculateSubscriptionCoverage({
          subscriptions: [
            {
              id: plan.id,
              subscriptionCode: "NEW-SUB",
              entitlements: plan.entitlements.map((e) => ({
                serviceId: e.serviceId,
                remainingQuantity: e.quantity,
              })),
            },
            ...activeSubscriptions.map((s) => ({
              id: s.id || s._id || "",
              subscriptionCode: s.subscriptionCode,
              entitlements: (s.entitlements || []).map((e) => ({
                serviceId: e.serviceId,
                remainingQuantity: e.remainingQuantity,
              })),
            })),
          ],
        }),
      );
    }

    toast.success(`Added ${plan.name} to basket.`);
  };

  // Handle membership add from catalog
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
        isExistingPending: false,
      }),
    );
    toast.success(`Enrolled ${plan.name} in basket.`);
  };

  // Handle adding existing sold membership awaiting invoice
  const handleAddSoldMembership = (cm: CustomerMembership) => {
    if (!basket.customer) {
      const custObj =
        typeof cm.customerId === "object" && cm.customerId !== null
          ? cm.customerId
          : typeof cm.payerCustomerId === "object" &&
              cm.payerCustomerId !== null
            ? cm.payerCustomerId
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

    const planId =
      typeof cm.membershipPlanId === "object" && cm.membershipPlanId !== null
        ? (cm.membershipPlanId as { id?: string; _id?: string }).id ||
          (cm.membershipPlanId as { id?: string; _id?: string })._id ||
          ""
        : String(cm.membershipPlanId || "");

    dispatch(
      addMembershipToBasket({
        membershipPlanId: planId,
        customerMembershipId: cm.id || cm._id,
        membershipPurchaseId: cm.membershipPurchaseId,
        membershipCode: cm.membershipCode,
        name: cm.planSnapshot?.name || "Membership",
        code: cm.membershipCode,
        tier: cm.planSnapshot?.tier || "Standard",
        price: cm.planSnapshot?.price || 0,
        serviceDiscountPercentage:
          cm.planSnapshot?.benefits?.serviceDiscountPercentage || 0,
        productDiscountPercentage:
          cm.planSnapshot?.benefits?.productDiscountPercentage || 0,
        isExistingPending: true,
      }),
    );
    toast.success(`Added pending membership ${cm.membershipCode} to basket.`);
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

    const catId =
      typeof svc.categoryId === "object" && svc.categoryId !== null
        ? (svc.categoryId as { _id?: string; id?: string })._id ||
          (svc.categoryId as { _id?: string; id?: string }).id
        : String(svc.categoryId || "");

    dispatch(
      addWalkinServiceToBasket({
        serviceId: svc.id,
        categoryId: catId,
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
  const handleSelectCustomer = (customerId: string, customerObj?: Customer) => {
    if (!customerId) {
      dispatch(
        setBasketCustomer({
          id: "",
          name: "",
          phone: "",
          email: null,
        }),
      );
      return;
    }

    if (customerObj) {
      dispatch(
        setBasketCustomer({
          id: customerObj.id || customerObj._id || customerId,
          name: customerObj.name,
          phone: customerObj.phone,
          email: customerObj.email || null,
        }),
      );
      toast.success(`Customer set to ${customerObj.name}`);
      return;
    }

    const list = Array.isArray(customersData?.data) ? customersData.data : [];
    const found = list.find(
      (c: { id?: string; _id?: string }) =>
        c.id === customerId || c._id === customerId,
    );
    if (found) {
      dispatch(
        setBasketCustomer({
          id: found.id || found._id || customerId,
          name: found.name,
          phone: found.phone,
          email: found.email || null,
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
          soldByStaffId: p.soldByStaffId || undefined,
        })),
        subscriptionLines: catalogSubLines.map((line) => ({
          ...line,
          soldByStaffId:
            basket.subscriptionLines.find((item) => item.planId === line.planId)
              ?.soldByStaffId || undefined,
        })),
        membershipLines: basket.membershipLines.map((m) => ({
          membershipPlanId: m.membershipPlanId || undefined,
          customerMembershipId: m.customerMembershipId || undefined,
          membershipPurchaseId: m.membershipPurchaseId || undefined,
          quantity: 1,
          soldByStaffId: m.soldByStaffId || undefined,
          payerCustomerId: m.payerCustomerId || undefined,
          beneficiaryCustomerIds: m.beneficiaryCustomerIds || undefined,
          beneficiaries: m.beneficiaries || undefined,
        })),
        serviceLines: basket.walkinServiceLines.map((s) => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
          performedByStaffId: s.performedByStaffId || undefined,
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
    <div className="h-full w-full flex flex-col md:flex-row overflow-hidden bg-background">
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

          {/* Searchable Production Customer Selector */}
          <div className="w-full sm:w-80">
            <CustomerSelector
              value={basket.customer?.id || ""}
              onChange={(customerId, customerObj) =>
                handleSelectCustomer(customerId, customerObj)
              }
              branchId={currentBranchId || undefined}
            />
          </div>
        </div>

        {/* Source Navigation Tabs & Search */}
        <div className="px-4 py-2 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Production-grade segmented tab navigation with no-scrollbar ribbon */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            <Button
              variant={activeTab === "appointments" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("appointments")}
              className="h-8 text-xs gap-1.5 shrink-0 rounded-lg font-medium"
            >
              <Calendar className="h-3.5 w-3.5" />
              Appointments
              {appointments.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-[10px] ml-1 bg-background/80"
                >
                  {appointments.length}
                </Badge>
              )}
            </Button>

            <Button
              variant={activeTab === "products" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("products")}
              className="h-8 text-xs gap-1.5 shrink-0 rounded-lg font-medium"
            >
              <Package className="h-3.5 w-3.5" />
              Retail Products
            </Button>

            <Button
              variant={activeTab === "services" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("services")}
              className="h-8 text-xs gap-1.5 shrink-0 rounded-lg font-medium"
            >
              <Scissors className="h-3.5 w-3.5" />
              Walk-in Services
            </Button>

            <Button
              variant={activeTab === "subscriptions" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("subscriptions")}
              className="h-8 text-xs gap-1.5 shrink-0 rounded-lg font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Subscriptions
            </Button>

            <Button
              variant={activeTab === "memberships" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("memberships")}
              className="h-8 text-xs gap-1.5 shrink-0 rounded-lg font-medium"
            >
              <Crown className="h-3.5 w-3.5" />
              Memberships
            </Button>
          </div>

          {/* Contextual & Aligned Search Control */}
          <div className="relative w-full md:w-64 shrink-0 flex items-center">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-background rounded-lg border-border focus-visible:ring-1 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                title="Clear filter"
                aria-label="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-bold text-foreground">
                              #{apt.appointmentCode}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAppointmentForDetails(apt);
                                setIsAppointmentDetailsOpen(true);
                              }}
                              className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer shrink-0"
                              title="View full appointment details"
                              aria-label="View full appointment details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
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
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3 flex-wrap">
                <div className="flex items-center gap-2">
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

                {/* Prominent Sell Subscription Header Action */}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!currentCustomerId) {
                      toast.error(
                        "Please select a customer before selling a subscription.",
                      );
                      return;
                    }
                    setSelectedPlanForSellSubscription(null);
                    setIsSellSubscriptionOpen(true);
                  }}
                  className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sell Subscription
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
                                    <span className="sr-only">
                                      View Details
                                    </span>
                                  </Button>
                                </div>
                                {(() => {
                                  const isCancelledPrevious =
                                    Array.isArray(sub.invoiceHistory) &&
                                    sub.invoiceHistory.length > 0 &&
                                    sub.invoiceHistory[
                                      sub.invoiceHistory.length - 1
                                    ].status === "cancelled";

                                  return isCancelledPrevious ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                                    >
                                      Invoice Cancelled (Ready to Bill)
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40"
                                    >
                                      Uninvoiced
                                    </Badge>
                                  );
                                })()}
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
                                  disabled={isSubInBasket}
                                  onClick={() => handleAddSoldSubscription(sub)}
                                  className={`h-7 text-[11px] px-2.5 gap-1.5 transition-all select-none ${
                                    isSubInBasket
                                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-medium"
                                      : "bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
                                  }`}
                                >
                                  {isSubInBasket ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                                      <span>In Basket</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3.5 w-3.5" />
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
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (!currentCustomerId) {
                                        toast.error(
                                          "Please select a customer before selling a subscription.",
                                        );
                                        return;
                                      }
                                      setSelectedPlanForSellSubscription(plan);
                                      setIsSellSubscriptionOpen(true);
                                    }}
                                    className="h-7 text-[11px] px-2.5 gap-1 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-medium select-none"
                                  >
                                    <Sparkles className="h-3 w-3" /> Sell
                                    Subscription
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAddSubscription(plan)}
                                    className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground font-medium select-none"
                                    title="Add directly to sale basket"
                                  >
                                    <Plus className="h-3.5 w-3.5" /> Add
                                  </Button>
                                </div>
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
              {/* Toggle: Sold Memberships vs Plans Catalog */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      membershipViewMode === "pending" ? "default" : "outline"
                    }
                    onClick={() => setMembershipViewMode("pending")}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    Sold Memberships (Pending Invoice)
                    {currentCustomerId &&
                      Array.isArray(pendingMembershipsData?.data) &&
                      pendingMembershipsData.data.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 px-1.5 py-0 text-[10px] h-4 bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none"
                        >
                          {pendingMembershipsData.data.length}
                        </Badge>
                      )}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant={
                      membershipViewMode === "catalog" ? "default" : "outline"
                    }
                    onClick={() => setMembershipViewMode("catalog")}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Membership Plans Catalog
                  </Button>
                </div>

                {/* Prominent Sell Membership Header Action */}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!currentCustomerId) {
                      toast.error(
                        "Please select a customer before selling a membership.",
                      );
                      return;
                    }
                    setSelectedPlanIdForSellMembership(null);
                    setIsSellMembershipOpen(true);
                  }}
                  className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Sell Membership
                </Button>
              </div>

              {/* Sub-view 1: Pending Sold Memberships */}
              {membershipViewMode === "pending" && (
                <div className="space-y-3">
                  {!currentCustomerId ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      Select a customer to view their sold memberships.
                    </div>
                  ) : isPendingMembershipsLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Loading pending memberships...
                    </div>
                  ) : !Array.isArray(pendingMembershipsData?.data) ||
                    pendingMembershipsData.data.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                      No pending memberships found waiting for invoice
                      generation.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pendingMembershipsData.data.map(
                        (cm: CustomerMembership) => {
                          const isMemInBasket = basket.membershipLines.some(
                            (l) =>
                              l.customerMembershipId === (cm.id || cm._id) ||
                              (cm.membershipPurchaseId &&
                                l.membershipPurchaseId ===
                                  cm.membershipPurchaseId),
                          );
                          const customerName =
                            cm.customer?.name ||
                            (typeof cm.customerId === "object" &&
                            cm.customerId !== null
                              ? (cm.customerId as { name?: string }).name
                              : "Customer");
                          const customerPhone =
                            cm.customer?.phone ||
                            (typeof cm.customerId === "object" &&
                            cm.customerId !== null
                              ? (cm.customerId as { phone?: string }).phone
                              : "");

                          return (
                            <div
                              key={cm.id || cm._id}
                              className={`p-3 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                                isMemInBasket
                                  ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500"
                                  : "border-amber-200 dark:border-amber-900/50 bg-card"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                                      {cm.membershipCode}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedMemForInfo(cm)}
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-md"
                                      title="View Membership Privileges & Beneficiary Details"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span className="sr-only">
                                        View Details
                                      </span>
                                    </Button>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40"
                                  >
                                    {cm.planSnapshot?.tier || "Standard"} Tier
                                  </Badge>
                                </div>

                                <div className="mt-2 space-y-1">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    {customerName}{" "}
                                    {customerPhone ? `(${customerPhone})` : ""}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                                    <div>
                                      Plan:{" "}
                                      {cm.planSnapshot?.name || "Membership"}
                                    </div>
                                    <div>
                                      •{" "}
                                      {cm.planSnapshot?.benefits
                                        ?.serviceDiscountPercentage ?? 0}
                                      % OFF Services
                                    </div>
                                    <div>
                                      •{" "}
                                      {cm.planSnapshot?.benefits
                                        ?.productDiscountPercentage ?? 0}
                                      % OFF Products
                                    </div>
                                  </div>
                                  {cm.notes && (
                                    <p className="text-[11px] text-muted-foreground italic truncate">
                                      &ldquo;{cm.notes}&rdquo;
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-sm text-foreground">
                                  {formatCurrency(cm.planSnapshot?.price || 0)}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedMemForInfo(cm)}
                                    className="h-7 text-[11px] px-2.5 gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Details
                                  </Button>

                                  <Button
                                    variant={
                                      isMemInBasket ? "secondary" : "default"
                                    }
                                    size="sm"
                                    disabled={isMemInBasket}
                                    onClick={() => handleAddSoldMembership(cm)}
                                    className={`h-7 text-[11px] px-2.5 gap-1.5 transition-all select-none ${
                                      isMemInBasket
                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium"
                                        : "bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                                    }`}
                                  >
                                    {isMemInBasket ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                                        <span>In Basket</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add to Basket</span>
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view 2: Membership Plans Catalog */}
              {membershipViewMode === "catalog" && (
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
                                  • {plan.benefits?.serviceDiscountPercentage}%
                                  OFF Salon Services
                                </div>
                                <div>
                                  • {plan.benefits?.productDiscountPercentage}%
                                  OFF Retail Products
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-border flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-sm text-foreground">
                                {formatCurrency(plan.price)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (!currentCustomerId) {
                                      toast.error(
                                        "Please select a customer before selling a membership.",
                                      );
                                      return;
                                    }
                                    setSelectedPlanIdForSellMembership(
                                      plan.id || plan._id,
                                    );
                                    setIsSellMembershipOpen(true);
                                  }}
                                  className="h-7 text-[11px] px-2.5 gap-1 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-medium select-none"
                                >
                                  <Sparkles className="h-3 w-3" /> Sell
                                  Membership
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddMembership(plan)}
                                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground font-medium select-none"
                                  title="Add directly to sale basket"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
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

      {/* Customer Membership & Privileges Info Modal */}
      {selectedMemForInfo && (
        <CustomerMembershipDetailsModal
          membership={selectedMemForInfo}
          isOpen={Boolean(selectedMemForInfo)}
          onClose={() => setSelectedMemForInfo(null)}
        />
      )}

      {/* Sell Membership Full Workflow Dialog */}
      {isSellMembershipOpen && (
        <SellMembershipDialog
          isOpen={isSellMembershipOpen}
          onClose={() => {
            setIsSellMembershipOpen(false);
            setSelectedPlanIdForSellMembership(null);
          }}
          isLoading={
            sellMembershipMutation.isPending ||
            createMembershipPlanMutation.isPending
          }
          plans={canonicalPlans}
          selectedPlanId={selectedPlanIdForSellMembership}
          initialCustomerId={currentCustomerId || null}
          lockCustomer={Boolean(currentCustomerId)}
          onCreateCustomPlanAndSell={async (
            customPlanPayload,
            checkoutData,
          ) => {
            if (!currentBranchId || isAllBranchesSelected) {
              toast.error(
                "Please select a specific branch before selling a membership.",
              );
              return;
            }

            try {
              const createdPlan =
                await createMembershipPlanMutation.mutateAsync(
                  customPlanPayload,
                );

              const res = await sellMembershipMutation.mutateAsync({
                membershipPlanId: createdPlan.id,
                payerCustomerId: checkoutData.payerCustomerId,
                beneficiaryCustomerIds: checkoutData.beneficiaryCustomerIds,
                beneficiaries: checkoutData.beneficiaries,
                branchId: currentBranchId,
                soldByStaffId: checkoutData.soldByStaffId || undefined,
                notes:
                  checkoutData.notes ||
                  "Membership sold from sales workspace catalogue",
                billImmediately: true,
              });

              setIsSellMembershipOpen(false);
              setSelectedPlanIdForSellMembership(null);

              // If customer wasn't set in basket, auto-set to the purchaser
              if (!basket.customer && checkoutData.payerCustomerId) {
                handleSelectCustomer(checkoutData.payerCustomerId);
              }

              // Invalidate membership and benefit caches so benefits activate immediately
              await queryClient.invalidateQueries({
                queryKey: ["memberships"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["customer-memberships"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["customer-benefits"],
              });

              const memberCount =
                res?.customerMemberships?.length ||
                checkoutData.beneficiaryCustomerIds?.length ||
                1;
              const memCode = res?.customerMembership?.membershipCode || "";
              toast.success(
                `Membership created and sold! Enrolled ${memberCount} member(s). ${memCode ? `Code: ${memCode}` : ""}`.trim(),
              );
            } catch (err: unknown) {
              const msg =
                err instanceof Error
                  ? err.message
                  : (err as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message ||
                    "Failed to sell custom membership.";
              toast.error(msg);
            }
          }}
          onSubmit={async (values) => {
            if (!currentBranchId || isAllBranchesSelected) {
              toast.error(
                "Please select a specific branch before selling a membership.",
              );
              return;
            }

            try {
              const res = await sellMembershipMutation.mutateAsync({
                membershipPlanId: values.membershipPlanId,
                payerCustomerId: values.payerCustomerId,
                beneficiaryCustomerIds: values.beneficiaryCustomerIds,
                beneficiaries: values.beneficiaries,
                branchId: currentBranchId,
                soldByStaffId: values.soldByStaffId || undefined,
                notes:
                  values.notes ||
                  "Membership sold from sales workspace catalogue",
                billImmediately: true,
              });

              setIsSellMembershipOpen(false);
              setSelectedPlanIdForSellMembership(null);

              // If customer wasn't set in basket, auto-set to the purchaser
              if (!basket.customer && values.payerCustomerId) {
                handleSelectCustomer(values.payerCustomerId);
              }

              // Invalidate membership and benefit caches so benefits activate immediately
              await queryClient.invalidateQueries({
                queryKey: ["memberships"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["customer-memberships"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["customer-benefits"],
              });

              const memberCount =
                res?.customerMemberships?.length ||
                values.beneficiaryCustomerIds?.length ||
                1;
              const memCode = res?.customerMembership?.membershipCode || "";
              toast.success(
                `Membership sold successfully! Enrolled ${memberCount} member(s). ${memCode ? `Code: ${memCode}` : ""}`.trim(),
              );
            } catch (err: unknown) {
              const msg =
                err instanceof Error
                  ? err.message
                  : (err as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message || "Failed to sell membership.";
              toast.error(msg);
            }
          }}
        />
      )}

      {/* Sell Subscription Full Workflow Dialog */}
      {isSellSubscriptionOpen && (
        <Dialog
          isOpen={isSellSubscriptionOpen}
          onClose={() => {
            setIsSellSubscriptionOpen(false);
            setSelectedPlanForSellSubscription(null);
          }}
          maxWidth="5xl"
          title="Sell Customer Subscription"
        >
          <CreateSubscriptionDialog
            isOpen={isSellSubscriptionOpen}
            onClose={() => {
              setIsSellSubscriptionOpen(false);
              setSelectedPlanForSellSubscription(null);
            }}
            isLoading={createSubMutation.isPending}
            initialCustomerId={currentCustomerId}
            initialPlan={selectedPlanForSellSubscription}
            branchId={currentBranchId || undefined}
            lockCustomer={Boolean(currentCustomerId)}
            onSubmit={async (formValues) => {
              if (!currentBranchId || isAllBranchesSelected) {
                toast.error(
                  "Please select a specific branch before selling a subscription.",
                );
                return;
              }

              try {
                const canonicalPayload = buildSubscriptionPurchasePayload({
                  values: formValues,
                  effectiveBranchId: currentBranchId,
                  defaultCustomerId: currentCustomerId,
                });

                const createdSub = await createSubMutation.mutateAsync({
                  payload: canonicalPayload,
                  branchId: currentBranchId,
                });

                setIsSellSubscriptionOpen(false);
                setSelectedPlanForSellSubscription(null);

                // If basket customer wasn't set, auto-set to purchaser
                if (!basket.customer && canonicalPayload.payerCustomerId) {
                  handleSelectCustomer(canonicalPayload.payerCustomerId);
                }

                await queryClient.invalidateQueries({
                  queryKey: ["subscriptions"],
                });

                // Immediately evaluate subscription coverage in current basket lines
                const subEntitlements =
                  createdSub?.entitlements ||
                  formValues.entitlements ||
                  selectedPlanForSellSubscription?.entitlements ||
                  [];

                if (
                  Array.isArray(subEntitlements) &&
                  subEntitlements.length > 0
                ) {
                  dispatch(
                    recalculateSubscriptionCoverage({
                      subscriptions: [
                        {
                          id: createdSub?.id || "NEW-SUB",
                          subscriptionCode:
                            createdSub?.subscriptionCode || "NEW-SUB",
                          entitlements: subEntitlements.map((e) => ({
                            serviceId: e.serviceId,
                            remainingQuantity:
                              "remainingQuantity" in e &&
                              typeof e.remainingQuantity === "number"
                                ? e.remainingQuantity
                                : "quantity" in e &&
                                    typeof e.quantity === "number"
                                  ? e.quantity
                                  : 1,
                          })),
                        },
                        ...activeSubscriptions.map((s) => ({
                          id: s.id || s._id || "",
                          subscriptionCode: s.subscriptionCode,
                          entitlements: (s.entitlements || []).map((e) => ({
                            serviceId: e.serviceId,
                            remainingQuantity: e.remainingQuantity,
                          })),
                        })),
                      ],
                    }),
                  );
                }

                toast.success(
                  `Subscription ${createdSub?.subscriptionCode || ""} sold successfully!`,
                );
              } catch (err: unknown) {
                const errorObj = err as Record<string, unknown> | null;
                const responseObj = errorObj?.response as Record<
                  string,
                  unknown
                > | null;
                const msg =
                  ((responseObj?.data as Record<string, unknown> | null)
                    ?.message as string) ||
                  (errorObj?.message as string) ||
                  "Failed to sell subscription.";
                toast.error(msg);
              }
            }}
          />
        </Dialog>
      )}

      {/* Comprehensive Full Appointment Details Modal */}
      {selectedAppointmentForDetails && (
        <AppointmentDetailsDialog
          appointment={selectedAppointmentForDetails}
          isOpen={isAppointmentDetailsOpen}
          onClose={() => {
            setIsAppointmentDetailsOpen(false);
            setSelectedAppointmentForDetails(null);
          }}
          onReschedule={() => {
            setIsAppointmentDetailsOpen(false);
            router.push("/appointments");
          }}
          onAssignStaff={() => {
            setIsAppointmentDetailsOpen(false);
            router.push("/appointments");
          }}
          onEditServices={() => {
            setIsAppointmentDetailsOpen(false);
            router.push("/appointments");
          }}
          onChangeStatus={() => {
            setIsAppointmentDetailsOpen(false);
            router.push("/appointments");
          }}
          onDelete={() => {
            setIsAppointmentDetailsOpen(false);
            router.push("/appointments");
          }}
          onCompleteAppointment={(appt) => {
            setIsAppointmentDetailsOpen(false);
            handleCompleteAppointment(appt);
          }}
          canEdit={canEditAppointments}
          canStatus={canStatusAppointments}
          canDelete={canDeleteAppointments}
        />
      )}
    </div>
  );
}
