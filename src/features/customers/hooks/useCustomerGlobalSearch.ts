import { useQuery } from "@tanstack/react-query";
import { searchCustomersGlobal } from "../api/customers.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { Customer } from "../types/customer.types";

export interface UseCustomerGlobalSearchParams {
  search: string;
  limit?: number;
  status?: string;
  isActive?: boolean;
  enabled?: boolean;
}

/**
 * Hook to search customers organization-wide (across all branches).
 * Used primarily for booking and appointments when roaming customers visit a different branch.
 *
 * It only triggers when search query has at least 2 non-whitespace characters to prevent
 * exposing the entire customer database.
 */
export function useCustomerGlobalSearch({
  search,
  limit = 10,
  status,
  isActive,
  enabled = true,
}: UseCustomerGlobalSearchParams) {
  const auth = useAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const user = auth?.user ?? null;
  const trimmedSearch = search.trim();

  const hasAccess =
    hasPermission(user, "customers.view") ||
    hasPermission(user, "appointments.create");

  const shouldQuery =
    Boolean(enabled) &&
    isAuthenticated &&
    hasAccess &&
    trimmedSearch.length >= 2;

  return useQuery<Customer[]>({
    queryKey: ["customers", "global-search", trimmedSearch, limit, status, isActive],
    queryFn: () =>
      searchCustomersGlobal({
        search: trimmedSearch,
        limit,
        status,
        isActive,
      }),
    enabled: shouldQuery,
    staleTime: 30_000,
  });
}

