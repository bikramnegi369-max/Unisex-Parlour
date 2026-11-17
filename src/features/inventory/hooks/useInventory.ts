import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "../api/inventory.api";
import {
  ProductFilters,
  StockFilters,
  MovementFilters
} from "../types/inventory.types";
import {
  CreateProductInput,
  ManualConsumptionInput,
  StockAdjustmentInput,
  StockTransferInput
} from "../schemas/inventory.schema";
import { useBranchContext } from "@/hooks/useBranchContext";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasOrgWideAccess, hasPermission } from "@/lib/permissions";

export const INVENTORY_QUERY_KEYS = {
  products: (organizationId: string | null, filters?: ProductFilters) =>
    ["inventory-products", organizationId, filters],
  product: (organizationId: string | null, id: string) =>
    ["inventory-product", organizationId, id],
  stock: (organizationId: string | null, branchId: string | null, filters?: StockFilters) =>
    getScopeQueryKey("inventory-stock", branchId, [organizationId, filters]),
  movements: (organizationId: string | null, branchId: string | null, filters?: MovementFilters) =>
    getScopeQueryKey("inventory-movements", branchId, [organizationId, filters])
};

export const useProducts = (filters?: ProductFilters) => {
  const { currentOrganization } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const organizationId = currentOrganization?.id || null;

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.products(organizationId, filters),
    queryFn: () => inventoryApi.getProducts(filters),
    enabled:
      isAuthenticated &&
      hasPermission(user, "inventory.view") &&
      Boolean(organizationId)
  });
};

export const useProduct = (id: string) => {
  const { currentOrganization } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const organizationId = currentOrganization?.id || null;

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.product(organizationId, id),
    queryFn: () => inventoryApi.getProductById(id),
    enabled:
      Boolean(id) &&
      Boolean(organizationId) &&
      isAuthenticated &&
      hasPermission(user, "inventory.view")
  });
};

export const useBranchStock = (filters?: StockFilters) => {
  const { currentBranchId, currentOrganization } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const organizationId = currentOrganization?.id || null;
  const effectiveBranchId =
    filters?.branchId === "all" ? null : filters?.branchId || currentBranchId;
  const hasScope = effectiveBranchId !== null || hasOrgWideAccess(user);

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.stock(organizationId, effectiveBranchId, filters),
    queryFn: () => inventoryApi.getBranchStock({ ...filters, branchId: effectiveBranchId || undefined }),
    enabled:
      Boolean(organizationId) &&
      isAuthenticated &&
      hasPermission(user, "inventory.view") &&
      hasScope
  });
};

export const useStockMovements = (filters?: MovementFilters) => {
  const { currentBranchId, currentOrganization } = useBranchContext();
  const { isAuthenticated, user } = useAuth();
  const organizationId = currentOrganization?.id || null;
  const effectiveBranchId =
    filters?.branchId === "all" ? null : filters?.branchId || currentBranchId;
  const hasScope = effectiveBranchId !== null || hasOrgWideAccess(user);

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.movements(organizationId, effectiveBranchId, filters),
    queryFn: () => inventoryApi.getMovements({ ...filters, branchId: effectiveBranchId || undefined }),
    enabled:
      Boolean(organizationId) &&
      isAuthenticated &&
      hasPermission(user, "inventory.view") &&
      hasScope
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) => inventoryApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useBranchContext();
  const organizationId = currentOrganization?.id || null;
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductInput> }) =>
      inventoryApi.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({
        queryKey: INVENTORY_QUERY_KEYS.product(organizationId, variables.id)
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
    }
  });
};

export const useRecordConsumption = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: ManualConsumptionInput; idempotencyKey?: string }) =>
      inventoryApi.recordConsumption(payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "inventory-stock" });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "inventory-movements" });
    }
  });
};

export const useRecordAdjustment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: StockAdjustmentInput; idempotencyKey?: string }) =>
      inventoryApi.recordAdjustment(payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "inventory-stock" });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "inventory-movements" });
    }
  });
};

export const useRecordTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: { payload: StockTransferInput; idempotencyKey?: string }) =>
      inventoryApi.recordTransfer(payload, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "inventory-stock" });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "inventory-movements" });
    }
  });
};
