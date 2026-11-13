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

export const INVENTORY_QUERY_KEYS = {
  products: (filters?: ProductFilters) => ["inventory-products", filters],
  product: (id: string) => ["inventory-product", id],
  stock: (branchId: string | null, filters?: StockFilters) =>
    getScopeQueryKey("inventory-stock", branchId, [filters]),
  movements: (branchId: string | null, filters?: MovementFilters) =>
    getScopeQueryKey("inventory-movements", branchId, [filters])
};

export const useProducts = (filters?: ProductFilters) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.products(filters),
    queryFn: () => inventoryApi.getProducts(filters)
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.product(id),
    queryFn: () => inventoryApi.getProductById(id),
    enabled: Boolean(id)
  });
};

export const useBranchStock = (filters?: StockFilters) => {
  const { currentBranchId } = useBranchContext();
  const effectiveBranchId = filters?.branchId || currentBranchId;

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.stock(effectiveBranchId, filters),
    queryFn: () => inventoryApi.getBranchStock({ ...filters, branchId: effectiveBranchId || undefined }),
    enabled: Boolean(effectiveBranchId)
  });
};

export const useStockMovements = (filters?: MovementFilters) => {
  const { currentBranchId } = useBranchContext();
  const effectiveBranchId = filters?.branchId || currentBranchId;

  return useQuery({
    queryKey: INVENTORY_QUERY_KEYS.movements(effectiveBranchId, filters),
    queryFn: () => inventoryApi.getMovements({ ...filters, branchId: effectiveBranchId || undefined })
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
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductInput> }) =>
      inventoryApi.updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEYS.product(variables.id) });
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
