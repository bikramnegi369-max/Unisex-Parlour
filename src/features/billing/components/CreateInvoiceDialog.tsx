"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Receipt,
  ShieldCheck,
  User,
  Calendar,
  Scissors,
  Award,
  Sparkles,
  ShoppingBag,
  Plus,
  Trash2,
  Package,
  CreditCard,
  Crown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCreateInvoice } from "../hooks/useBillingMutations";
import {
  createInvoiceSchema,
  type CreateInvoiceFormValues,
} from "../schemas/billing.schema";
import type { Appointment, AppointmentServiceSnapshot } from "@/features/appointments/types/appointment.types";
import { useCustomer } from "@/features/customers/hooks/useCustomer";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { useRedemptionPreview } from "@/features/loyalty/hooks/useLoyaltyQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { useBranchContext } from "@/hooks/useBranchContext";
import { PosProductCart, type CartProductLine } from "./PosProductCart";
import { useServices } from "@/features/services/hooks/services/useServices";
import { useServiceCategories } from "@/features/services/hooks/categories/useServiceCategories";
import { useSubscriptions } from "@/features/subscriptions/hooks/useSubscriptions";
import { useSubscriptionPlans } from "@/features/subscriptions/hooks/useSubscriptionPlans";
import { useMembershipPlans } from "../hooks/useBillingQueries";
import type { Service } from "@/features/services/types/service.types";
import type { Subscription, SubscriptionMember, SubscriptionEntitlement } from "@/features/subscriptions/types/subscription.types";
import type { SubscriptionPlan } from "@/features/subscriptions/types/plan.types";
import type { MembershipPlanItem } from "../api/billing.api";

export interface CartServiceLine {
  serviceId: string;
  name: string;
  duration?: number;
  unitPrice: number;
  quantity: number;
}

export interface CartSubscriptionLine {
  planId: string;
  name: string;
  code?: string;
  suggestedPrice: number;
  entitlements?: { serviceId: string; quantity: number }[];
}

export interface CartMembershipLine {
  membershipPlanId: string;
  name: string;
  code: string;
  tier: string;
  price: number;
  serviceDiscountPercentage: number;
  productDiscountPercentage: number;
}

export interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  initialTab?: "products" | "services" | "subscriptions" | "memberships";
  initialSubPlanId?: string;
  initialMemPlanId?: string;
  initialCustomerId?: string;
  onSuccess?: (invoiceId: string) => void;
}

export function CreateInvoiceDialog({
  isOpen,
  onClose,
  appointment = null,
  initialTab = "products",
  initialSubPlanId,
  initialMemPlanId,
  initialCustomerId,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const { currentBranchId } = useBranchContext();
  const createInvoiceMutation = useCreateInvoice();

  // Active Tab for Catalog Items in Unified Checkout
  const [activeCatalogTab, setActiveCatalogTab] = useState<"products" | "services" | "subscriptions" | "memberships">(initialTab);

  // Selection states
  const [selectedWalkinCustomerId, setSelectedWalkinCustomerId] = useState<string>(initialCustomerId || "");
  const [productCartItems, setProductCartItems] = useState<CartProductLine[]>([]);
  const [customServiceItems, setCustomServiceItems] = useState<CartServiceLine[]>([]);
  const [subscriptionCartItems, setSubscriptionCartItems] = useState<CartSubscriptionLine[]>([]);
  const [membershipCartItems, setMembershipCartItems] = useState<CartMembershipLine[]>([]);

  // Pickers state
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedSubPlanId, setSelectedSubPlanId] = useState<string>("");
  const [selectedMemPlanId, setSelectedMemPlanId] = useState<string>("");

  // Customer options
  const { data: customersResponse } = useCustomers(
    { limit: 100 },
    { enabled: isOpen && !appointment }
  );
  const customerOptions = useMemo(() => {
    return Array.isArray(customersResponse?.data) ? customersResponse.data : [];
  }, [customersResponse]);

  const customerId = appointment?.customerId || appointment?.customer?.id || selectedWalkinCustomerId;
  const { data: customer } = useCustomer(customerId || null);

  const effectiveBranchId =
    appointment?.branchId ||
    appointment?.branch?.id ||
    currentBranchId ||
    "";

  const effectiveAppointmentId = appointment?.id || undefined;

  // Fetch active subscriptions for customer to detect covered services (as in CreateAppointmentDialog)
  const { data: customerSubsData } = useSubscriptions(
    { customerId: customerId || undefined, limit: 50 },
    { enabled: Boolean(customerId && isOpen) }
  );

  const activeSubscriptions: Subscription[] = useMemo(() => {
    return (customerSubsData?.data || []).filter((sub: Subscription) => {
      return sub.status === "active" || sub.status === "pending_payment";
    });
  }, [customerSubsData?.data]);

  // Map each serviceId to candidate subscription entitlements for this customer
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
        ? members.find((m: SubscriptionMember) => m.customerId === customerId)
        : undefined;

      if (hasMembersArray && !memberEntry) continue;

      if (
        effectiveBranchId &&
        sub.permittedBranchIds &&
        sub.permittedBranchIds.length > 0 &&
        !sub.permittedBranchIds.includes(effectiveBranchId)
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
  }, [activeSubscriptions, customerId, effectiveBranchId]);

  const subscribedServiceIds = useMemo(() => {
    const set = new Set<string>();
    subscriptionsByService.forEach((candidates, sId) => {
      if (candidates.some((c) => c.remaining > 0)) {
        set.add(sId);
      }
    });
    return set;
  }, [subscriptionsByService]);

  // Service Category state & queries
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all");
  const [serviceSearchTerm, setServiceSearchTerm] = useState<string>("");
  const { data: categoriesData } = useServiceCategories();
  const serviceCategories = useMemo(() => {
    return Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  }, [categoriesData]);

  // Catalog Queries for unified lines
  const { data: servicesData } = useServices({ limit: "all" });
  const servicesList: Service[] = useMemo(() => {
    if (!servicesData) return [];
    if (Array.isArray(servicesData)) return servicesData;
    if (Array.isArray((servicesData as { data?: Service[] })?.data)) {
      return (servicesData as { data: Service[] }).data;
    }
    return [];
  }, [servicesData]);

  const { data: subPlansData } = useSubscriptionPlans({ isActive: true });
  const subscriptionPlansList: SubscriptionPlan[] = useMemo(() => {
    return Array.isArray(subPlansData?.data) ? subPlansData.data : [];
  }, [subPlansData]);

  const { data: membershipPlansData } = useMembershipPlans(effectiveBranchId);
  const membershipPlansList: MembershipPlanItem[] = useMemo(() => {
    return Array.isArray(membershipPlansData) ? membershipPlansData : [];
  }, [membershipPlansData]);

  // Prepopulate initial subscription plan if passed via props
  useEffect(() => {
    if (initialSubPlanId && subscriptionPlansList.length > 0) {
      const plan = subscriptionPlansList.find((p) => p.id === initialSubPlanId || (p as { _id?: string })._id === initialSubPlanId);
      if (plan && !subscriptionCartItems.some((i) => i.planId === (plan.id || (plan as { _id?: string })._id))) {
        setSubscriptionCartItems([
          {
            planId: plan.id || (plan as { _id?: string })._id || "",
            name: plan.name,
            code: (plan as { code?: string }).code || plan.name.slice(0, 4).toUpperCase(),
            suggestedPrice: plan.suggestedPrice ?? 0,
            entitlements: plan.entitlements?.map((e) => ({
              serviceId: typeof e.serviceId === "object" ? (e.serviceId as { _id?: string; id?: string })._id || (e.serviceId as { id?: string }).id || "" : String(e.serviceId),
              quantity: e.quantity,
            })),
          },
        ]);
        setActiveCatalogTab("subscriptions");
      }
    }
  }, [initialSubPlanId, subscriptionPlansList]);

  // Prepopulate initial membership plan if passed via props
  useEffect(() => {
    if (initialMemPlanId && membershipPlansList.length > 0) {
      const plan = membershipPlansList.find((p) => p.id === initialMemPlanId || p._id === initialMemPlanId);
      if (plan && membershipCartItems.length === 0) {
        setMembershipCartItems([
          {
            membershipPlanId: plan.id || plan._id,
            name: plan.name,
            code: plan.code,
            tier: plan.tier,
            price: plan.price ?? 0,
            serviceDiscountPercentage: plan.benefits?.serviceDiscountPercentage ?? 0,
            productDiscountPercentage: plan.benefits?.productDiscountPercentage ?? 0,
          },
        ]);
        setActiveCatalogTab("memberships");
      }
    }
  }, [initialMemPlanId, membershipPlansList]);

  // Appointment snapshot services
  const appointmentServices = useMemo(() => {
    return appointment?.services || [];
  }, [appointment]);

  // Combined Services (Appointment + In-Cart Walk-in)
  const allServiceLines = useMemo(() => {
    const list: { name: string; unitPrice: number; quantity: number; duration?: number; isFromAppointment?: boolean; appliedSub?: boolean }[] = [];
    for (const s of appointmentServices) {
      list.push({
        name: s.name,
        unitPrice: s.price || 0,
        quantity: 1,
        duration: s.duration,
        isFromAppointment: true,
        appliedSub: Boolean(s.appliedSubscriptionId),
      });
    }
    for (const cs of customServiceItems) {
      list.push({
        name: cs.name,
        unitPrice: cs.unitPrice,
        quantity: cs.quantity,
        duration: cs.duration,
        isFromAppointment: false,
        appliedSub: false,
      });
    }
    return list;
  }, [appointmentServices, customServiceItems]);

  // Determine In-Cart Membership Tier Benefits
  const activeInCartMembership = membershipCartItems[0] || null;
  const inCartServiceDiscountPct = activeInCartMembership?.serviceDiscountPercentage || 0;
  const inCartProductDiscountPct = activeInCartMembership?.productDiscountPercentage || 0;

  // In-cart Subscription entitlement waiver simulation
  // When subscription pack is added, see if it covers any ongoing appointment service!
  const upsoldSubPlan = subscriptionCartItems[0] || null;
  const upsellWaiverMap = useMemo(() => {
    const map = new Map<number, boolean>();
    if (!upsoldSubPlan || !upsoldSubPlan.entitlements || upsoldSubPlan.entitlements.length === 0) {
      return map;
    }
    const availableEnts = new Map<string, number>();
    for (const ent of upsoldSubPlan.entitlements) {
      availableEnts.set(String(ent.serviceId), (availableEnts.get(String(ent.serviceId)) || 0) + ent.quantity);
    }

    appointmentServices.forEach((s, idx) => {
      const sId = String(s.serviceId);
      if (availableEnts.has(sId) && (availableEnts.get(sId) || 0) > 0) {
        map.set(idx, true);
        availableEnts.set(sId, (availableEnts.get(sId) || 0) - 1);
      }
    });
    return map;
  }, [upsoldSubPlan, appointmentServices]);

  // Financial Subtotals (Raw)
  const servicesSubtotal = useMemo(() => {
    return allServiceLines.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);
  }, [allServiceLines]);

  const productsSubtotal = useMemo(() => {
    return productCartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [productCartItems]);

  const subscriptionsSubtotal = useMemo(() => {
    return subscriptionCartItems.reduce((sum, item) => sum + item.suggestedPrice, 0);
  }, [subscriptionCartItems]);

  const membershipsSubtotal = useMemo(() => {
    return membershipCartItems.reduce((sum, item) => sum + item.price, 0);
  }, [membershipCartItems]);

  const subtotal = servicesSubtotal + productsSubtotal + subscriptionsSubtotal + membershipsSubtotal;

  // Estimated Waivers and Tier Discounts Preview
  const subscriptionCoveredAmount = useMemo(() => {
    let covered = 0;
    appointmentServices.forEach((s, idx) => {
      if (s.appliedSubscriptionId || upsellWaiverMap.get(idx)) {
        covered += s.price || 0;
      }
    });
    return covered;
  }, [appointmentServices, upsellWaiverMap]);

  const membershipDiscountPreview = useMemo(() => {
    let disc = 0;
    if (inCartServiceDiscountPct > 0) {
      appointmentServices.forEach((s, idx) => {
        if (!s.appliedSubscriptionId && !upsellWaiverMap.get(idx)) {
          disc += Number((((s.price || 0) * inCartServiceDiscountPct) / 100).toFixed(2));
        }
      });
      customServiceItems.forEach((cs) => {
        disc += Number((((cs.unitPrice * cs.quantity) * inCartServiceDiscountPct) / 100).toFixed(2));
      });
    }
    if (inCartProductDiscountPct > 0) {
      productCartItems.forEach((p) => {
        disc += Number((((p.unitPrice * p.quantity) * inCartProductDiscountPct) / 100).toFixed(2));
      });
    }
    return Number(disc.toFixed(2));
  }, [inCartServiceDiscountPct, inCartProductDiscountPct, appointmentServices, upsellWaiverMap, customServiceItems, productCartItems]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema) as unknown as Resolver<CreateInvoiceFormValues>,
    defaultValues: {
      branchId: effectiveBranchId,
      appointmentId: effectiveAppointmentId,
      customerId: customerId || undefined,
      redeemLoyaltyPoints: 0,
      notes: appointment?.notes || "",
    },
    values: {
      branchId: effectiveBranchId,
      appointmentId: effectiveAppointmentId,
      customerId: customerId || undefined,
      redeemLoyaltyPoints: 0,
      notes: appointment?.notes || "",
    },
  });

  const enteredLoyaltyPoints =
    Number(
      useWatch({
        control,
        name: "redeemLoyaltyPoints",
        defaultValue: 0,
      })
    ) || 0;

  const debouncedLoyaltyPoints = useDebounce(enteredLoyaltyPoints, 350);

  const preliminaryBillAmount = Math.max(0, subtotal - subscriptionCoveredAmount - membershipDiscountPreview);

  const { data: previewData, isLoading: isPreviewLoading } = useRedemptionPreview(
    customerId && debouncedLoyaltyPoints > 0
      ? {
          customerId,
          billAmount: preliminaryBillAmount,
          pointsRequested: debouncedLoyaltyPoints,
        }
      : null,
    { enabled: Boolean(isOpen && customerId && debouncedLoyaltyPoints > 0) }
  );

  const estimatedPayable =
    previewData?.effectivePayable ??
    Math.max(
      0,
      subtotal - subscriptionCoveredAmount - membershipDiscountPreview - (previewData?.appliedDiscount || 0)
    );

  // Line Addition Handlers
  const handleAddService = () => {
    if (!selectedServiceId) return;
    const svc = servicesList.find((s) => s.id === selectedServiceId);
    if (!svc) return;

    setCustomServiceItems((prev) => {
      const existing = prev.find((i) => i.serviceId === svc.id);
      if (existing) {
        return prev.map((i) => (i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          serviceId: svc.id,
          name: svc.name,
          duration: svc.duration,
          unitPrice: svc.pricing?.basePrice ?? 0,
          quantity: 1,
        },
      ];
    });
    setSelectedServiceId("");
  };

  const handleAddSubscription = () => {
    if (!selectedSubPlanId) return;
    const plan = subscriptionPlansList.find((p) => p.id === selectedSubPlanId || p._id === selectedSubPlanId);
    if (!plan) return;

    if (subscriptionCartItems.some((i) => i.planId === plan.id)) {
      toast.info("This subscription plan is already added to cart.");
      return;
    }

    setSubscriptionCartItems((prev) => [
      ...prev,
      {
        planId: plan.id,
        name: plan.name,
        code: (plan as { code?: string }).code || plan.name.slice(0, 4).toUpperCase(),
        suggestedPrice: plan.suggestedPrice ?? 0,
        entitlements: plan.entitlements?.map((e) => ({
          serviceId: typeof e.serviceId === "object" ? (e.serviceId as { _id?: string; id?: string })._id || (e.serviceId as { id?: string }).id || "" : String(e.serviceId),
          quantity: e.quantity,
        })),
      },
    ]);
    setSelectedSubPlanId("");
  };

  const handleAddMembership = () => {
    if (!selectedMemPlanId) return;
    const plan = membershipPlansList.find((p) => p.id === selectedMemPlanId || p._id === selectedMemPlanId);
    if (!plan) return;

    if (membershipCartItems.length > 0) {
      toast.info("One membership plan per invoice is permitted.");
      return;
    }

    setMembershipCartItems([
      {
        membershipPlanId: plan.id || plan._id,
        name: plan.name,
        code: plan.code,
        tier: plan.tier,
        price: plan.price ?? 0,
        serviceDiscountPercentage: plan.benefits?.serviceDiscountPercentage ?? 0,
        productDiscountPercentage: plan.benefits?.productDiscountPercentage ?? 0,
      },
    ]);
    setSelectedMemPlanId("");
  };

  const onSubmit = async (values: CreateInvoiceFormValues) => {
    if (!effectiveBranchId) {
      toast.error("Branch is required to generate an invoice.");
      return;
    }

    if (!appointment && !selectedWalkinCustomerId) {
      toast.error("Please select a customer for walk-in checkout.");
      return;
    }

    const hasAnyLine =
      appointment ||
      productCartItems.length > 0 ||
      customServiceItems.length > 0 ||
      subscriptionCartItems.length > 0 ||
      membershipCartItems.length > 0;

    if (!hasAnyLine) {
      toast.error("Please add at least one line item (service, product, package or membership) to the cart.");
      return;
    }

    try {
      const productLinesPayload = productCartItems.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
      }));

      const serviceLinesPayload = customServiceItems.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
      }));

      const subscriptionLinesPayload = subscriptionCartItems.map((sub) => ({
        planId: sub.planId,
      }));

      const membershipLinesPayload = membershipCartItems.map((mem) => ({
        membershipPlanId: mem.membershipPlanId,
        quantity: 1,
      }));

      const invoice = await createInvoiceMutation.mutateAsync({
        branchId: effectiveBranchId,
        appointmentId: effectiveAppointmentId,
        customerId: customerId || undefined,
        productLines: productLinesPayload.length > 0 ? productLinesPayload : undefined,
        serviceLines: serviceLinesPayload.length > 0 ? serviceLinesPayload : undefined,
        subscriptionLines: subscriptionLinesPayload.length > 0 ? subscriptionLinesPayload : undefined,
        membershipLines: membershipLinesPayload.length > 0 ? membershipLinesPayload : undefined,
        redeemLoyaltyPoints: values.redeemLoyaltyPoints && values.redeemLoyaltyPoints > 0 ? values.redeemLoyaltyPoints : undefined,
        notes: values.notes,
      });

      toast.success(`Draft invoice ${invoice.invoiceNumber || ""} created successfully.`);
      reset();
      setProductCartItems([]);
      setCustomServiceItems([]);
      setSubscriptionCartItems([]);
      setMembershipCartItems([]);
      setSelectedWalkinCustomerId("");
      onClose();
      if (onSuccess) {
        onSuccess(invoice.id);
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to generate invoice.";
      toast.error(msg);
    }
  };

  const onInvalid = (formErrors: typeof errors) => {
    const firstErrorMessage =
      formErrors.branchId?.message ||
      formErrors.appointmentId?.message ||
      formErrors.customerId?.message ||
      formErrors.redeemLoyaltyPoints?.message ||
      "Please check the invoice form fields.";
    toast.error(firstErrorMessage);
  };

  const isWalkInMode = !appointment;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isWalkInMode ? "Unified POS Checkout" : "Generate Unified Invoice"}
      maxWidth="4xl"
      className="max-h-[92vh] overflow-y-auto"
    >
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">
          {isWalkInMode
            ? "Unified point-of-sale checkout: compose retail products, walk-in services, subscription packages, and membership enrollments in one authoritative invoice."
            : `Create a unified invoice for Appointment ${appointment.appointmentCode || `#${appointment.id.slice(-6)}`} with optional retail products, subscription packs, or membership tier upsells.`}
        </p>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
          {/* Header Customer / Appointment Banner */}
          {appointment ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-muted/30 border border-border/80 rounded-xl text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <User className="h-3.5 w-3.5" /> Customer Details
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {appointment.customer?.name || "Customer"}
                </p>
                <p className="text-muted-foreground">
                  {appointment.customer?.phone || "No phone"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <Calendar className="h-3.5 w-3.5" /> Appointment Details
                </span>
                <p className="font-semibold text-foreground">
                  {formatDate(appointment.date, "dd MMM yyyy")} at {appointment.startTime || "—"}
                </p>
                <p className="text-muted-foreground capitalize">
                  Type: {appointment.bookingType.replace("_", " ")} • Status: {appointment.status}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2 text-xs">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                Select Customer (Walk-in Unified Checkout)
              </label>
              <select
                aria-label="Select walk-in customer"
                value={selectedWalkinCustomerId}
                onChange={(e) => setSelectedWalkinCustomerId(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
              >
                <option value="">-- Choose registered customer --</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone || "No phone"}) - {c.loyaltyPoints ?? 0} pts
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Appointment Services (if present) */}
          {appointment && appointmentServices.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-primary" />
                  Appointment Services Snapshot
                </label>
                <span className="text-[11px] text-muted-foreground">Authoritative snapshot prices</span>
              </div>

              <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60 bg-card">
                {appointmentServices.map((item: AppointmentServiceSnapshot, idx: number) => {
                  const isExistingSub = Boolean(item.appliedSubscriptionId);
                  const isUpsellCovered = Boolean(upsellWaiverMap.get(idx));
                  return (
                    <div
                      key={item.serviceId || item._id || item.id || `apt-srv-${idx}`}
                      className="p-3 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate">{item.name}</span>
                          {item.duration && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {item.duration}m
                            </span>
                          )}
                          {isExistingSub && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 px-1.5 py-0">
                              <ShieldCheck className="h-3 w-3 mr-1 inline" />
                              Subscription Redeemed
                            </Badge>
                          )}
                          {isUpsellCovered && (
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 px-1.5 py-0">
                              <ShieldCheck className="h-3 w-3 mr-1 inline" />
                              Covered by In-Cart Upsell Package
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-semibold text-foreground font-mono">
                          {formatCurrency(item.price || 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unified Multi-Line Adders & Tabs */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Cart Lines
              </label>

              {/* Pill tabs for selectors */}
              <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/60 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveCatalogTab("products")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeCatalogTab === "products"
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingBag className="h-3 w-3 inline mr-1" />
                  Products ({productCartItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCatalogTab("services")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeCatalogTab === "services"
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Scissors className="h-3 w-3 inline mr-1" />
                  Services ({customServiceItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCatalogTab("subscriptions")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeCatalogTab === "subscriptions"
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3 inline mr-1" />
                  Packages ({subscriptionCartItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCatalogTab("memberships")}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors ${
                    activeCatalogTab === "memberships"
                      ? "bg-background text-foreground shadow-2xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Crown className="h-3 w-3 inline mr-1" />
                  Memberships ({membershipCartItems.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: Products Cart & Selector */}
            {activeCatalogTab === "products" && (
              <div className="p-3 bg-muted/20 border border-border/70 rounded-xl">
                <PosProductCart
                  branchId={effectiveBranchId}
                  items={productCartItems}
                  onChange={setProductCartItems}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* TAB CONTENT 2: Walk-in Services Selector */}
            {activeCatalogTab === "services" && (
              <div className="p-3.5 bg-muted/20 border border-border/70 rounded-xl space-y-3.5">
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
                    All Services ({servicesList.length})
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
                      Subscribed Plans ({subscribedServiceIds.size})
                    </button>
                  )}

                  {serviceCategories.map((cat: { id?: string; _id?: string; name: string }) => {
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
                  })}
                </div>

                {/* Subscribed Banner if customer has subscriptions and not filtered to subscribed */}
                {subscribedServiceIds.size > 0 && selectedServiceCategory !== "subscribed" && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                        Customer has {subscribedServiceIds.size} service(s) covered under active subscription plans.
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

                {/* Service Dropdown & Quick Add Bar */}
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="flex-1 h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
                  >
                    <option value="">-- Select service catalog item --</option>
                    {servicesList
                      .filter((svc) => {
                        if (selectedServiceCategory === "subscribed") {
                          return subscribedServiceIds.has(svc.id);
                        }
                        if (selectedServiceCategory !== "all") {
                          const catId = typeof svc.categoryId === "object" ? svc.categoryId?._id : svc.categoryId;
                          return catId === selectedServiceCategory;
                        }
                        return true;
                      })
                      .map((svc) => {
                        const subCandidates = subscriptionsByService.get(svc.id) || [];
                        const hasSub = subCandidates.some((c) => c.remaining > 0);
                        const totalRemaining = subCandidates.reduce((s, c) => s + c.remaining, 0);
                        return (
                          <option key={svc.id} value={svc.id}>
                            {svc.name} ({svc.duration}m) — {formatCurrency(svc.pricing?.basePrice ?? 0)}
                            {hasSub ? ` [Plan Quota: ${totalRemaining} left]` : ""}
                          </option>
                        );
                      })}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddService}
                    disabled={!selectedServiceId}
                    className="h-8 text-xs gap-1 shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Service
                  </Button>
                </div>

                {customServiceItems.length > 0 && (
                  <div className="border border-border/60 rounded-lg overflow-hidden divide-y divide-border/60 bg-card text-xs">
                    {customServiceItems.map((cs) => {
                      const subCandidates = subscriptionsByService.get(cs.serviceId) || [];
                      const isCovered = subCandidates.some((c) => c.remaining > 0);
                      return (
                        <div key={cs.serviceId} className="p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="font-semibold text-foreground">{cs.name}</span>
                            {isCovered && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 px-1.5 py-0">
                                <ShieldCheck className="h-3 w-3 mr-1 inline" />
                                Plan Quota
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatCurrency(cs.unitPrice)} each
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Input
                              type="number"
                              min="1"
                              value={cs.quantity}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setCustomServiceItems((prev) =>
                                  prev.map((item) => (item.serviceId === cs.serviceId ? { ...item, quantity: val } : item))
                                );
                              }}
                              className="w-14 h-7 text-xs text-center"
                            />
                            <span className="font-mono font-bold w-18 text-right">
                              {formatCurrency(cs.unitPrice * cs.quantity)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                setCustomServiceItems((prev) => prev.filter((i) => i.serviceId !== cs.serviceId))
                              }
                              className="text-muted-foreground hover:text-destructive h-7 w-7"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: Subscription Packages Selector */}
            {activeCatalogTab === "subscriptions" && (
              <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-3">
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedSubPlanId}
                    onChange={(e) => setSelectedSubPlanId(e.target.value)}
                    className="flex-1 h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
                  >
                    <option value="">-- Select subscription package to upsell/sell --</option>
                    {subscriptionPlansList.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {formatCurrency(plan.suggestedPrice ?? 0)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddSubscription}
                    disabled={!selectedSubPlanId}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Package
                  </Button>
                </div>

                {subscriptionCartItems.length > 0 && (
                  <div className="border border-border/60 rounded-lg overflow-hidden divide-y divide-border/60 bg-card text-xs">
                    {subscriptionCartItems.map((sub) => (
                      <div key={sub.planId} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                            {sub.name} ({sub.code})
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Activates on settlement • Sessions will be credited to customer account
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {formatCurrency(sub.suggestedPrice)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              setSubscriptionCartItems((prev) => prev.filter((i) => i.planId !== sub.planId))
                            }
                            className="text-muted-foreground hover:text-destructive h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: Membership Plans Selector */}
            {activeCatalogTab === "memberships" && (
              <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-3">
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedMemPlanId}
                    onChange={(e) => setSelectedMemPlanId(e.target.value)}
                    className="flex-1 h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground"
                  >
                    <option value="">-- Select membership tier plan to enroll/upsell --</option>
                    {membershipPlansList.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.tier} Tier) — {formatCurrency(plan.price ?? 0)} [{plan.benefits?.serviceDiscountPercentage}% svc / {plan.benefits?.productDiscountPercentage}% prod]
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddMembership}
                    disabled={!selectedMemPlanId}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Enroll Membership
                  </Button>
                </div>

                {membershipCartItems.length > 0 && (
                  <div className="border border-border/60 rounded-lg overflow-hidden divide-y divide-border/60 bg-card text-xs">
                    {membershipCartItems.map((mem) => (
                      <div key={mem.membershipPlanId} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                            <Crown className="h-3.5 w-3.5" />
                            {mem.name} — {mem.tier} Tier Plan
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Perks: {mem.serviceDiscountPercentage}% off services • {mem.productDiscountPercentage}% off retail
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {formatCurrency(mem.price)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setMembershipCartItems([])}
                            className="text-muted-foreground hover:text-destructive h-7 w-7"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-Time Financial Totals & Benefit Recalculation Breakdown */}
          <div className="p-3.5 bg-muted/40 border border-border/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Catalog Subtotal</span>
              <span className="font-medium font-mono text-foreground">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* In-Cart Subscription Waiver Preview */}
            {subscriptionCoveredAmount > 0 && (
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Subscription Covered Amount (Waived)
                </span>
                <span className="font-mono font-bold">-{formatCurrency(subscriptionCoveredAmount)}</span>
              </div>
            )}

            {/* In-Cart Membership Tier Discount Preview */}
            {membershipDiscountPreview > 0 && (
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium">
                <span className="flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5" />
                  Membership Tier Discount Preview ({activeInCartMembership?.tier})
                </span>
                <span className="font-mono font-bold">-{formatCurrency(membershipDiscountPreview)}</span>
              </div>
            )}

            {/* Loyalty Redemption */}
            {previewData?.isEligible && (
              <div className="flex items-center justify-between text-primary font-medium">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Loyalty Points Discount ({previewData.appliedPoints} pts)
                </span>
                <span className="font-mono font-bold">
                  -{formatCurrency(previewData.appliedDiscount)}
                </span>
              </div>
            )}

            {/* Loyalty Points Input Field */}
            {customer && (customer.loyaltyPoints ?? 0) > 0 && (
              <div className="pt-2 border-t border-border/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Redeem Loyalty Points
                  </span>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                    Available: {customer.loyaltyPoints ?? 0} pts
                  </Badge>
                </div>

                <Input
                  type="number"
                  min="0"
                  max={customer.loyaltyPoints ?? 0}
                  step="1"
                  placeholder="Enter points to redeem..."
                  {...register("redeemLoyaltyPoints")}
                  className="text-xs h-8"
                />

                {isPreviewLoading && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Calculating server redemption preview...
                  </p>
                )}
              </div>
            )}

            {/* Final Authoritative Estimate Headline */}
            <div className="flex items-center justify-between pt-2.5 border-t border-border/80 font-bold text-sm text-foreground">
              <span className="uppercase tracking-wide text-xs">Estimated Customer Payable</span>
              <span className="text-lg text-primary font-black font-mono">
                {formatCurrency(estimatedPayable)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Invoice Notes (Optional)
            </label>
            <Textarea
              rows={2}
              placeholder="Add any internal or billing notes..."
              {...register("notes")}
              className="text-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting || createInvoiceMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || createInvoiceMutation.isPending}
              className="text-xs font-semibold gap-1.5"
            >
              <Receipt className="h-3.5 w-3.5" />
              {isSubmitting || createInvoiceMutation.isPending
                ? "Generating..."
                : "Generate Draft Invoice"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
