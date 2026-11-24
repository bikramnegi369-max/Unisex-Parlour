"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  clearSaleBasket,
  removeProductFromBasket,
  updateProductBasketQuantity,
  removeSubscriptionFromBasket,
  removeMembershipFromBasket,
  setProductSeller,
  setSubscriptionSeller,
  setMembershipSeller,
  setWalkinServicePerformer,
  removeWalkinServiceFromBasket,
  updateWalkinServiceQuantity,
  clearBasketAppointment,
  setBasketDiscount,
  setBasketLoyaltyRedemption,
} from "@/store/slices/saleBasketSlice";
import { formatCurrency } from "@/lib/formatters";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Crown,
  Calendar,
  AlertTriangle,
  Receipt,
  FileText,
  User,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBranchContext } from "@/hooks/useBranchContext";
import { StaffAttributionSelect } from "@/features/employees/components/StaffAttributionSelect";
import { useCustomerActiveBenefits } from "@/features/memberships/hooks/useMemberships";
import { isServiceEligibleForMembershipBenefits } from "@/features/memberships/utils/membershipEligibility";
import { useCustomer } from "@/features/customers/hooks/useCustomer";
import {
  useLoyaltyProgram,
  useRedemptionPreview,
} from "@/features/loyalty/hooks/useLoyaltyQueries";
import { useDebounce } from "@/hooks/useDebounce";

interface SaleBasketPanelProps {
  onCheckout: () => void;
  isSubmitting?: boolean;
}

export function SaleBasketPanel({
  onCheckout,
  isSubmitting = false,
}: SaleBasketPanelProps) {
  const dispatch = useDispatch();
  const basket = useSelector((state: RootState) => state.saleBasket);
  const { currentBranchId } = useBranchContext();

  // Load customer profile to get authoritative loyaltyPoints and debt status
  const customerId = basket.customer?.id || null;
  const { data: customer } = useCustomer(customerId);

  // Authoritative organization loyalty program rules (minRedemptionPoints, maxRedemptionPercentage, etc.)
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const minThresholdPoints = loyaltyProgram?.minRedemptionPoints ?? 20;

  // If customer has an existing persisted active/pending membership in backend, load their privileges
  const { data: customerBenefitsData } = useCustomerActiveBenefits(
    basket.customer?.id || "",
    currentBranchId || undefined,
  );

  // User's temporary typing buffer. If null, displays authoritative Redux state.
  const [typingValue, setTypingValue] = useState<string | null>(null);
  const inputValue =
    typingValue !== null
      ? typingValue
      : basket.redeemLoyaltyPoints > 0
        ? String(basket.redeemLoyaltyPoints)
        : "";

  const debouncedTyping = useDebounce(typingValue, 350);

  // Sync debounced typing to Redux (side-effect updating external state management)
  useEffect(() => {
    if (debouncedTyping === null) return;

    if (debouncedTyping === "") {
      if (basket.redeemLoyaltyPoints !== 0) {
        dispatch(setBasketLoyaltyRedemption(0));
      }
      return;
    }

    const num = Math.floor(Number(debouncedTyping));
    if (isNaN(num)) return;

    const maxAvailable = customer?.loyaltyPoints ?? 0;
    const clamped = Math.min(Math.max(0, num), maxAvailable);
    if (clamped !== basket.redeemLoyaltyPoints) {
      dispatch(setBasketLoyaltyRedemption(clamped));
    }
  }, [debouncedTyping, customer?.loyaltyPoints, basket.redeemLoyaltyPoints, dispatch]);

  // Financial calculations derived from basket
  const totals = useMemo(() => {
    let subtotal = 0;
    let subscriptionCoveredAmount = 0;

    // 1. Appointment lines
    for (const aptLine of basket.appointmentLines) {
      const lineTotal = aptLine.unitPrice * aptLine.quantity;
      subtotal += lineTotal;
      if (aptLine.isCoveredBySubscription) {
        subscriptionCoveredAmount += lineTotal;
      }
    }

    // 2. Walkin service lines
    for (const sLine of basket.walkinServiceLines) {
      const lineTotal = sLine.unitPrice * sLine.quantity;
      subtotal += lineTotal;
      if (sLine.isCoveredBySubscription) {
        subscriptionCoveredAmount += lineTotal;
      }
    }

    // 3. Retail product lines
    for (const pLine of basket.productLines) {
      subtotal += pLine.unitPrice * pLine.quantity;
    }

    // 4. Subscription plan lines
    for (const subLine of basket.subscriptionLines) {
      subtotal += subLine.suggestedPrice;
    }

    // 5. Membership lines
    for (const memLine of basket.membershipLines) {
      subtotal += memLine.price;
    }

    // Membership tier discount calculation:
    // Check in-cart membership line first, fallback to existing active/pending membership benefits
    const inCartMem = basket.membershipLines[0];
    const backendSnapshot = customerBenefitsData?.hasActiveMembership
      ? customerBenefitsData.planSnapshot?.benefits
      : null;

    const effectiveServicePct =
      inCartMem?.serviceDiscountPercentage !== undefined
        ? inCartMem.serviceDiscountPercentage
        : backendSnapshot?.serviceDiscountPercentage || 0;

    const effectiveProductPct =
      inCartMem?.productDiscountPercentage !== undefined
        ? inCartMem.productDiscountPercentage
        : backendSnapshot?.productDiscountPercentage || 0;

    const effectiveBenefits = inCartMem
      ? {
          serviceDiscountPercentage: inCartMem.serviceDiscountPercentage,
          productDiscountPercentage: inCartMem.productDiscountPercentage,
        }
      : backendSnapshot;

    let membershipDiscount = 0;

    if (effectiveServicePct > 0) {
      for (const sLine of basket.walkinServiceLines) {
        if (!sLine.isCoveredBySubscription) {
          const isEligible = isServiceEligibleForMembershipBenefits(
            { serviceId: sLine.serviceId, categoryId: sLine.categoryId },
            effectiveBenefits,
          );
          if (isEligible) {
            membershipDiscount +=
              (sLine.unitPrice * sLine.quantity * effectiveServicePct) / 100;
          }
        }
      }
      for (const aptLine of basket.appointmentLines) {
        if (!aptLine.isCoveredBySubscription) {
          const isEligible = isServiceEligibleForMembershipBenefits(
            { serviceId: aptLine.serviceId, categoryId: aptLine.categoryId },
            effectiveBenefits,
          );
          if (isEligible) {
            membershipDiscount +=
              (aptLine.unitPrice * aptLine.quantity * effectiveServicePct) /
              100;
          }
        }
      }
    }

    if (effectiveProductPct > 0) {
      for (const pLine of basket.productLines) {
        membershipDiscount +=
          (pLine.unitPrice * pLine.quantity * effectiveProductPct) / 100;
      }
    }

    const discountTotal = basket.discountTotal + membershipDiscount;
    const grossPayable = Math.max(0, subtotal - subscriptionCoveredAmount);
    const payableAmount = Math.max(0, grossPayable - discountTotal);

    return {
      subtotal,
      subscriptionCoveredAmount,
      membershipDiscount,
      manualDiscount: basket.discountTotal,
      discountTotal,
      grossPayable,
      payableAmount,
      itemCount:
        basket.appointmentLines.length +
        basket.walkinServiceLines.length +
        basket.productLines.length +
        basket.subscriptionLines.length +
        basket.membershipLines.length,
      hasMembershipBenefits: effectiveServicePct > 0 || effectiveProductPct > 0,
      activeMembershipTier:
        inCartMem?.tier ||
        (customerBenefitsData?.hasActiveMembership
          ? customerBenefitsData.planSnapshot?.tier || "Standard"
          : null),
    };
  }, [basket, customerBenefitsData]);

  // Calculate the maximum redeemable points allowed for this cart and customer
  const maxRedeemableForCart = useMemo(() => {
    const available = customer?.loyaltyPoints ?? 0;
    if (available < minThresholdPoints || totals.grossPayable <= 0) {
      return 0;
    }
    const maxPct = loyaltyProgram?.maxRedemptionPercentage ?? 20;
    const rate = loyaltyProgram?.redemptionRate ?? 1;
    const maxDiscountAllowed = (totals.grossPayable * maxPct) / 100;
    const maxPointsByBill = Math.floor(maxDiscountAllowed / rate);
    return Math.min(available, maxPointsByBill);
  }, [
    customer?.loyaltyPoints,
    minThresholdPoints,
    totals.grossPayable,
    loyaltyProgram?.maxRedemptionPercentage,
    loyaltyProgram?.redemptionRate,
  ]);

  // Server-authoritative loyalty redemption preview query
  // Gate execution so we never send sub-threshold requests that trigger HTTP 400
  const isRedemptionPointsValid =
    basket.redeemLoyaltyPoints >= minThresholdPoints;

  const customerIdForPreview = basket.customer?.id;

  const previewParams = useMemo(() => {
    if (!customerIdForPreview || !isRedemptionPointsValid) {
      return null;
    }
    return {
      customerId: customerIdForPreview,
      billAmount: totals.grossPayable,
      pointsRequested: basket.redeemLoyaltyPoints,
    };
  }, [
    customerIdForPreview,
    totals.grossPayable,
    basket.redeemLoyaltyPoints,
    isRedemptionPointsValid,
  ]);

  const {
    data: loyaltyPreview,
    isLoading: isLoyaltyPreviewLoading,
    error: loyaltyPreviewError,
  } = useRedemptionPreview(previewParams, {
    enabled: Boolean(basket.customer?.id && isRedemptionPointsValid),
  });

  // Extract friendly server error message if preview failed
  const previewErrorMessage = useMemo(() => {
    if (!loyaltyPreviewError) return null;
    const axiosErr = loyaltyPreviewError as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return (
      axiosErr.response?.data?.message ||
      axiosErr.message ||
      "Unable to calculate points discount preview"
    );
  }, [loyaltyPreviewError]);

  // Effective net payable after membership, manual discount and authoritative loyalty discount
  const finalPayable = useMemo(() => {
    const loyaltyDiscount = loyaltyPreview?.appliedDiscount || 0;
    return Math.max(0, totals.payableAmount - loyaltyDiscount);
  }, [totals.payableAmount, loyaltyPreview?.appliedDiscount]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border select-none">
      {/* Basket Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Sale Basket</h2>
            <p className="text-xs text-muted-foreground">
              {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}{" "}
              selected
            </p>
          </div>
        </div>

        {totals.itemCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(clearSaleBasket())}
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Customer Header Badge */}
      <div className="p-3 bg-muted/40 border-b border-border">
        {basket.customer ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {basket.customer.name}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {basket.customer.phone}
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] h-5 bg-background shrink-0"
            >
              Locked Customer
            </Badge>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Select a Customer or Appointment to begin billing</span>
          </div>
        )}
      </div>

      {/* Existing Active Draft Warning Banner */}
      {basket.existingDraftInvoiceNumber && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Active Draft #{basket.existingDraftInvoiceNumber}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60">
            Resuming
          </span>
        </div>
      )}

      {/* Basket Line Items Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 divide-y divide-border/50">
        {totals.itemCount === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
              <ShoppingCart className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-xs font-medium">Your sale basket is empty</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1 max-w-50">
              Add completed appointments, retail products, subscription plans,
              or memberships from the left catalog.
            </p>
          </div>
        ) : (
          <>
            {/* Appointment Lines */}
            {basket.appointment && (
              <div className="pt-2 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Appointment #
                    {basket.appointment.appointmentCode}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => dispatch(clearBasketAppointment())}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {basket.appointmentLines.map((aptLine, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg border transition-all ${
                      aptLine.isCoveredBySubscription
                        ? "bg-emerald-500/5 border-emerald-500/25 ring-1 ring-emerald-500/10"
                        : "bg-muted/20 border-border/60"
                    }`}
                  >
                    <div className="truncate mr-2 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground truncate">
                          {aptLine.name}
                        </span>
                        {aptLine.isCoveredBySubscription && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-1 py-0 font-bold whitespace-nowrap"
                          >
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" />
                            Plan Quota
                          </Badge>
                        )}
                      </div>
                      {aptLine.isCoveredBySubscription ? (
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          {aptLine.subscriptionCode ? (
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              Sub #{aptLine.subscriptionCode}
                            </span>
                          ) : aptLine.appliedSubscriptionId ? (
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              Sub #
                              {aptLine.appliedSubscriptionId
                                .slice(-6)
                                .toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {formatCurrency(aptLine.unitPrice)} each
                        </div>
                      )}
                    </div>
                    <div className="w-16 text-right font-mono text-xs shrink-0">
                      {aptLine.isCoveredBySubscription ? (
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground line-through text-[10px]">
                            {formatCurrency(
                              aptLine.unitPrice * aptLine.quantity,
                            )}
                          </span>
                          <span className="text-emerald-600 font-bold">₹0</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-foreground">
                          {formatCurrency(aptLine.unitPrice * aptLine.quantity)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Walkin Services Lines */}
            {basket.walkinServiceLines.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Services
                </div>
                {basket.walkinServiceLines.map((s) => (
                  <div
                    key={s.serviceId}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1.5 px-2 rounded-lg border transition-all gap-2 ${
                      s.isCoveredBySubscription
                        ? "bg-emerald-500/5 border-emerald-500/25 ring-1 ring-emerald-500/10"
                        : "bg-muted/15 border-border/70"
                    }`}
                  >
                    <div className="truncate mr-2 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground truncate">
                          {s.name}
                        </span>
                        {s.isCoveredBySubscription && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-1 py-0 font-bold whitespace-nowrap"
                          >
                            <ShieldCheck className="h-2.5 w-2.5 mr-0.5 inline" />
                            Plan Quota
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1">
                        <StaffAttributionSelect
                          branchId={currentBranchId}
                          label="Performed by"
                          value={s.performedByStaffId}
                          compact
                          onChange={(staffId) =>
                            dispatch(
                              setWalkinServicePerformer({
                                serviceId: s.serviceId,
                                staffId,
                              }),
                            )
                          }
                        />
                      </div>
                      {s.isCoveredBySubscription ? (
                        <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                          {s.subscriptionCode ? (
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              Sub #{s.subscriptionCode}
                            </span>
                          ) : s.appliedSubscriptionId ? (
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                              Sub #
                              {s.appliedSubscriptionId.slice(-6).toUpperCase()}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          <span>{formatCurrency(s.unitPrice)} each</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quantity stepper controls */}
                      <div className="flex items-center border border-border rounded bg-background">
                        <button
                          type="button"
                          className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                          onClick={() =>
                            dispatch(
                              updateWalkinServiceQuantity({
                                serviceId: s.serviceId,
                                quantity: s.quantity - 1,
                              }),
                            )
                          }
                          aria-label="Decrease service quantity"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-5 text-center font-mono font-medium text-[11px]">
                          {s.quantity}
                        </span>
                        <button
                          type="button"
                          className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
                          onClick={() =>
                            dispatch(
                              updateWalkinServiceQuantity({
                                serviceId: s.serviceId,
                                quantity: s.quantity + 1,
                              }),
                            )
                          }
                          aria-label="Increase service quantity"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>

                      {/* Line pricing: show strike-through when covered */}
                      <div className="w-16 text-right font-mono text-xs">
                        {s.isCoveredBySubscription ? (
                          <div className="flex flex-col items-end">
                            <span className="text-muted-foreground line-through text-[10px]">
                              {formatCurrency(s.unitPrice * s.quantity)}
                            </span>
                            <span className="text-emerald-600 font-bold">
                              ₹0
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-foreground">
                            {formatCurrency(s.unitPrice * s.quantity)}
                          </span>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
                        onClick={() =>
                          dispatch(removeWalkinServiceFromBasket(s.serviceId))
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Retail Product Lines */}
            {basket.productLines.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Retail Products
                </div>
                {basket.productLines.map((p) => (
                  <div
                    key={p.productId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {p.sku ? `SKU: ${p.sku} | ` : ""}
                        {formatCurrency(p.unitPrice)} each
                      </div>
                      <div className="mt-1">
                        <StaffAttributionSelect
                          branchId={currentBranchId}
                          label="Sold by"
                          value={p.soldByStaffId}
                          compact
                          onChange={(staffId) =>
                            dispatch(
                              setProductSeller({
                                productId: p.productId,
                                staffId,
                              }),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-border rounded">
                        <button
                          type="button"
                          className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:bg-muted"
                          onClick={() =>
                            dispatch(
                              updateProductBasketQuantity({
                                productId: p.productId,
                                quantity: p.quantity - 1,
                              }),
                            )
                          }
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-bold">
                          {p.quantity}
                        </span>
                        <button
                          type="button"
                          className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:bg-muted"
                          onClick={() =>
                            dispatch(
                              updateProductBasketQuantity({
                                productId: p.productId,
                                quantity: p.quantity + 1,
                              }),
                            )
                          }
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <span className="font-mono font-medium w-14 text-right">
                        {formatCurrency(p.unitPrice * p.quantity)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          dispatch(removeProductFromBasket(p.productId))
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subscriptions Lines */}
            {basket.subscriptionLines.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Subscriptions
                </div>
                {basket.subscriptionLines.map((sub) => (
                  <div
                    key={sub.subscriptionId || sub.planId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {sub.name}
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold">
                        {sub.subscriptionId
                          ? "Pending Sale Subscription"
                          : "Service Package"}
                      </div>
                      {!sub.subscriptionId && (
                        <div className="mt-1">
                          <StaffAttributionSelect
                            branchId={currentBranchId}
                            label="Sold by"
                            value={sub.soldByStaffId}
                            compact
                            onChange={(staffId) =>
                              dispatch(
                                setSubscriptionSeller({
                                  planId: sub.planId,
                                  staffId,
                                }),
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-medium">
                        {formatCurrency(sub.suggestedPrice)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          dispatch(
                            removeSubscriptionFromBasket(
                              sub.subscriptionId || sub.planId,
                            ),
                          )
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Membership Lines */}
            {basket.membershipLines.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Membership
                </div>
                {basket.membershipLines.map((mem) => {
                  const lineKey =
                    mem.customerMembershipId ||
                    mem.membershipPurchaseId ||
                    mem.membershipPlanId;
                  return (
                    <div
                      key={lineKey}
                      className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">
                          {mem.name}
                        </div>
                        {mem.isExistingPending || mem.customerMembershipId ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium border border-amber-500/20">
                              Existing Membership – Pending Payment
                            </span>
                            {mem.membershipCode && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ({mem.membershipCode})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 font-semibold">
                            {mem.tier} Tier Plan (New Enrollment)
                          </div>
                        )}
                        {!mem.customerMembershipId && (
                          <div className="mt-1">
                            <StaffAttributionSelect
                              branchId={currentBranchId}
                              label="Sold by"
                              value={mem.soldByStaffId}
                              compact
                              onChange={(staffId) =>
                                dispatch(
                                  setMembershipSeller({
                                    membershipPlanId: mem.membershipPlanId,
                                    customerMembershipId:
                                      mem.customerMembershipId,
                                    staffId,
                                  }),
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-medium">
                          {formatCurrency(mem.price)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            dispatch(
                              removeMembershipFromBasket(
                                mem.customerMembershipId ||
                                  mem.membershipPlanId,
                              ),
                            )
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Basket Financial Breakdown Footer */}
      <div className="p-4 border-t border-border bg-card space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
        </div>

        {totals.subscriptionCoveredAmount > 0 && (
          <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
            <span>Subscription Covered</span>
            <span className="font-mono">
              -{formatCurrency(totals.subscriptionCoveredAmount)}
            </span>
          </div>
        )}

        {totals.membershipDiscount > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-600 font-medium">
            <span className="flex items-center gap-1">
              <Crown className="w-3 h-3" />
              <span>
                Membership Tier Discount{" "}
                {totals.activeMembershipTier
                  ? `(${totals.activeMembershipTier})`
                  : ""}
              </span>
            </span>
            <span className="font-mono">
              -{formatCurrency(totals.membershipDiscount)}
            </span>
          </div>
        )}

        {/* Manual Discount Input */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted-foreground">Manual Discount (₹)</span>
          <Input
            type="number"
            min="0"
            value={basket.discountTotal || ""}
            onChange={(e) =>
              dispatch(setBasketDiscount(Number(e.target.value) || 0))
            }
            placeholder="0"
            className="w-20 h-7 text-xs font-mono text-right"
          />
        </div>

        {/* Loyalty Points Redemption Section */}
        {customer && (customer.loyaltyPoints ?? 0) > 0 && (
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Redeem Loyalty Points</span>
              </span>
              <Badge
                variant="outline"
                className="text-[10px] text-primary border-primary/30"
              >
                Available: {customer.loyaltyPoints ?? 0} pts
              </Badge>
            </div>

            {/* Threshold & Debt Indicator */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                Min. redemption:{" "}
                <strong className="text-foreground">
                  {minThresholdPoints} pts
                </strong>
              </span>
              {(customer.loyaltyPoints ?? 0) < minThresholdPoints ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Needs {minThresholdPoints - (customer.loyaltyPoints ?? 0)}{" "}
                  more pts
                </span>
              ) : maxRedeemableForCart < minThresholdPoints ? (
                <span
                  className="text-amber-600 dark:text-amber-400 font-medium"
                  title="Bill subtotal is too low for minimum redemption cap"
                >
                  Bill amount too low
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTypingValue(null);
                    dispatch(setBasketLoyaltyRedemption(maxRedeemableForCart));
                  }}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Apply Max ({maxRedeemableForCart} pts)
                </button>
              )}
            </div>

            {(customer.loyaltyPointsDebt ?? 0) > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Customer has {customer.loyaltyPointsDebt} pts debt.
              </p>
            )}

            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={minThresholdPoints}
                max={customer.loyaltyPoints ?? 0}
                step="1"
                placeholder={`Min ${minThresholdPoints} pts...`}
                value={inputValue}
                onChange={(e) => setTypingValue(e.target.value)}
                className={`text-xs h-7 font-mono ${
                  inputValue &&
                  Number(inputValue) > 0 &&
                  Number(inputValue) < minThresholdPoints
                    ? "border-amber-500 focus-visible:ring-amber-500"
                    : ""
                }`}
              />
              {basket.redeemLoyaltyPoints > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTypingValue(null);
                    dispatch(setBasketLoyaltyRedemption(0));
                  }}
                  className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              )}
            </div>

            {/* Validation warning if cashier entered points below threshold */}
            {inputValue &&
              Number(inputValue) > 0 &&
              Number(inputValue) < minThresholdPoints && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  Entered points ({inputValue}) must be at least{" "}
                  {minThresholdPoints} points.
                </p>
              )}

            {isLoyaltyPreviewLoading && (
              <p className="text-[10px] text-muted-foreground italic">
                Calculating server redemption preview...
              </p>
            )}

            {previewErrorMessage && (
              <p className="text-[10px] text-destructive">
                {previewErrorMessage}
              </p>
            )}

            {loyaltyPreview &&
              !loyaltyPreview.isEligible &&
              loyaltyPreview.reason && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  {loyaltyPreview.reason}
                </p>
              )}

            {loyaltyPreview?.isEligible &&
              (loyaltyPreview.appliedDiscount ?? 0) > 0 && (
                <div className="flex items-center justify-between text-xs text-primary font-medium bg-primary/5 px-2 py-1 rounded border border-primary/20">
                  <span className="flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" />
                    Points Discount ({loyaltyPreview.appliedPoints} pts)
                  </span>
                  <span className="font-mono font-bold">
                    -{formatCurrency(loyaltyPreview.appliedDiscount)}
                  </span>
                </div>
              )}
          </div>
        )}

        <div className="pt-2 border-t border-border flex items-center justify-between font-bold text-sm text-foreground">
          <span>Net Payable</span>
          <span className="text-base font-mono text-primary font-extrabold">
            {formatCurrency(finalPayable)}
          </span>
        </div>

        {/* Checkout Button */}
        <Button
          type="button"
          disabled={
            totals.itemCount === 0 ||
            !basket.customer ||
            isSubmitting ||
            (basket.redeemLoyaltyPoints > 0 &&
              basket.redeemLoyaltyPoints < minThresholdPoints)
          }
          onClick={onCheckout}
          className="w-full h-10 mt-2 gap-2 text-xs font-bold uppercase tracking-wider"
        >
          {isSubmitting ? (
            <span>Creating Invoice...</span>
          ) : basket.existingDraftInvoiceNumber ? (
            <>
              <span>Update & Review Draft</span>
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              <Receipt className="h-4 w-4" />
              <span>Review & Create Invoice</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
