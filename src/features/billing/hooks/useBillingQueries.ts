import { useQuery } from "@tanstack/react-query";
import {
  getInvoices,
  getInvoice,
  getInvoicePayments,
  getCheckoutQueue,
  getInvoiceDiscountHistory,
  type CheckoutQueueQuery,
} from "../api/billing.api";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { InvoiceListQuery } from "../types/billing.types";

export function useInvoices(query: InvoiceListQuery = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "billing.view");

  const isEnabled = isAuthenticated && hasViewPermission && (currentBranchId !== null || isOrgWide);
  const queryKey = getBranchQueryKey("invoices", [query]);

  return useQuery({
    queryKey,
    queryFn: () => getInvoices(query),
    enabled: isEnabled,
  });
}

export function useInvoice(id: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "billing.view");

  // Guard against reserved route segments or non-hex MongoDB ObjectIds
  const isValidId = Boolean(id) && id !== "sales" && id !== "new" && /^[0-9a-fA-F]{24}$/.test(id!);
  const isEnabled = isAuthenticated && hasViewPermission && isValidId && (currentBranchId !== null || isOrgWide);
  const queryKey = getBranchQueryKey("invoice", [id || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getInvoice(id!),
    enabled: isEnabled,
  });
}

export function useInvoicePayments(invoiceId: string | undefined) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasPaymentsViewPermission =
    hasPermission(user, "payments.view") || hasPermission(user, "billing.view");

  // Guard against reserved route segments or non-hex MongoDB ObjectIds
  const isValidId = Boolean(invoiceId) && invoiceId !== "sales" && invoiceId !== "new" && /^[0-9a-fA-F]{24}$/.test(invoiceId!);
  const isEnabled =
    isAuthenticated && hasPaymentsViewPermission && isValidId && (currentBranchId !== null || isOrgWide);
  const queryKey = getBranchQueryKey("invoice-payments", [invoiceId || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getInvoicePayments(invoiceId!),
    enabled: isEnabled,
  });
}

export function useCheckoutQueue(query: CheckoutQueueQuery = {}) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission =
    hasPermission(user, "billing.view") || hasPermission(user, "billing.checkout");

  const effectiveBranchId = query.branchId !== undefined ? query.branchId : currentBranchId;
  const isEnabled =
    isAuthenticated && hasViewPermission && (effectiveBranchId !== null || isOrgWide);

  const queryKey = getBranchQueryKey("checkout-queue", [query]);

  return useQuery({
    queryKey,
    queryFn: () => getCheckoutQueue(query),
    enabled: isEnabled,
    refetchOnWindowFocus: true,
  });
}

export function useInvoiceDiscountHistory(invoiceId: string | undefined, branchId?: string) {
  const { currentBranchId, getBranchQueryKey } = useBranchContext();
  const { isAuthenticated, user } = useAuth();

  const isOrgWide = user?.hasOrgWideAccess === true;
  const hasViewPermission = hasPermission(user, "billing.view");

  const effectiveBranch = branchId || currentBranchId;
  const isEnabled =
    isAuthenticated && hasViewPermission && !!invoiceId && (effectiveBranch !== null || isOrgWide);

  const queryKey = getBranchQueryKey("invoice-discount-history", [invoiceId || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getInvoiceDiscountHistory(invoiceId!, branchId),
    enabled: isEnabled,
  });
}

export function useMembershipPlans(branchId?: string) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["membership-plans", branchId || "all"],
    queryFn: () => import("../api/billing.api").then((mod) => mod.getMembershipPlans(branchId)),
    enabled: isAuthenticated,
  });
}

