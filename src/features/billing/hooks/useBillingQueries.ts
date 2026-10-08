import { useQuery } from "@tanstack/react-query";
import {
  getInvoices,
  getInvoice,
  getInvoicePayments,
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

  const isEnabled = isAuthenticated && hasViewPermission && !!id && (currentBranchId !== null || isOrgWide);
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

  const isEnabled =
    isAuthenticated && hasPaymentsViewPermission && !!invoiceId && (currentBranchId !== null || isOrgWide);
  const queryKey = getBranchQueryKey("invoice-payments", [invoiceId || ""]);

  return useQuery({
    queryKey,
    queryFn: () => getInvoicePayments(invoiceId!),
    enabled: isEnabled,
  });
}
