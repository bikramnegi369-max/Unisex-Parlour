import { apiClient } from "@/lib/api/axios";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";
import {
  Product,
  StockBalance,
  StockMovement,
  ProductFilters,
  StockFilters,
  MovementFilters,
  ProductUsageType,
  StockUnit,
  MovementType,
} from "../types/inventory.types";
import {
  CreateProductInput,
  ManualConsumptionInput,
  StockAdjustmentInput,
  StockTransferInput,
} from "../schemas/inventory.schema";

interface RawProductDTO {
  _id?: string;
  id?: string;
  name: string;
  sku: string;
  category: string;
  usageType: ProductUsageType;
  stockUnit: StockUnit;
  costPrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  status?: "active" | "inactive";
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface RawStockBalanceDTO {
  _id?: string;
  id?: string;
  organizationId: string;
  branchId: string;
  productId: string | RawProductDTO;
  onHand: number;
  allocated?: number;
  lastMovementAt?: string;
  updatedAt?: string;
}

interface RawStockMovementDTO {
  _id?: string;
  id?: string;
  organizationId: string;
  branchId: string;
  productId: string | RawProductDTO;
  movementType: MovementType;
  quantityDelta: number;
  referenceType?: string;
  referenceId?: string;
  referenceModel?: string;
  balanceBefore?: number;
  balanceAfter: number;
  actorId: string | { _id?: string; id?: string; name?: string; email?: string; role?: string };
  notes?: string;
  idempotencyKey?: string;
  createdAt: string;
}

const mapProductDTO = (dto: RawProductDTO): Product => ({
  id: dto._id || dto.id || "",
  name: dto.name,
  sku: dto.sku,
  category: dto.category,
  usageType: dto.usageType,
  stockUnit: dto.stockUnit,
  costPrice: dto.costPrice ?? 0,
  sellingPrice: dto.sellingPrice ?? 0,
  reorderLevel: dto.reorderLevel ?? 0,
  status: dto.status || "active",
  organizationId: dto.organizationId || "",
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
});

const mapStockBalanceDTO = (dto: RawStockBalanceDTO): StockBalance => {
  const productObj =
    typeof dto.productId === "object" && dto.productId !== null
      ? mapProductDTO(dto.productId as RawProductDTO)
      : undefined;

  return {
    id: dto._id || dto.id || "",
    organizationId: dto.organizationId,
    branchId: dto.branchId,
    productId:
      typeof dto.productId === "string"
        ? dto.productId
        : (dto.productId as RawProductDTO)?._id ||
          (dto.productId as RawProductDTO)?.id ||
          "",
    product: productObj,
    onHand: dto.onHand,
    allocated: dto.allocated ?? 0,
    lastMovementAt:
      dto.lastMovementAt || dto.updatedAt || new Date().toISOString(),
  };
};

const mapStockMovementDTO = (dto: RawStockMovementDTO): StockMovement => {
  const productObj =
    typeof dto.productId === "object" && dto.productId !== null
      ? mapProductDTO(dto.productId as RawProductDTO)
      : undefined;

  const actorObj =
    typeof dto.actorId === "object" && dto.actorId !== null
      ? {
          id: dto.actorId._id || dto.actorId.id || "",
          name: dto.actorId.name || "",
          email: dto.actorId.email || ""
        }
      : undefined;

  const actorIdStr =
    typeof dto.actorId === "object" && dto.actorId !== null
      ? dto.actorId._id || dto.actorId.id || ""
      : dto.actorId || "";

  return {
    id: dto._id || dto.id || "",
    organizationId: dto.organizationId,
    branchId: dto.branchId,
    productId:
      typeof dto.productId === "string"
        ? dto.productId
        : (dto.productId as RawProductDTO)?._id ||
          (dto.productId as RawProductDTO)?.id ||
          "",
    product: productObj,
    movementType: dto.movementType,
    quantityDelta: dto.quantityDelta,
    referenceType: dto.referenceType,
    referenceId: dto.referenceId,
    balanceBefore: dto.balanceBefore,
    balanceAfter: dto.balanceAfter,
    actorId: actorIdStr,
    actor: actorObj,
    notes: dto.notes,
    createdAt: dto.createdAt,
  };
};

export const inventoryApi = {
  // 1. Product Catalogue
  async getProducts(
    params?: ProductFilters,
  ): Promise<PaginatedResponse<Product>> {
    const { data } = await apiClient.get<PaginatedResponse<RawProductDTO>>(
      "/inventory/products",
      {
        params,
        branchScope: "none",
      },
    );
    return {
      ...data,
      data: (data.data || []).map(mapProductDTO),
    };
  },

  async getProductById(id: string): Promise<Product> {
    const { data } = await apiClient.get<ApiResponse<RawProductDTO>>(
      `/inventory/products/${id}`,
      {
        branchScope: "none",
      },
    );
    return mapProductDTO(data.data);
  },

  async createProduct(payload: CreateProductInput): Promise<Product> {
    const { data } = await apiClient.post<ApiResponse<RawProductDTO>>(
      "/inventory/products",
      payload,
      {
        branchScope: "none",
      },
    );
    return mapProductDTO(data.data);
  },

  async updateProduct(
    id: string,
    payload: Partial<CreateProductInput>,
  ): Promise<Product> {
    const { data } = await apiClient.put<ApiResponse<RawProductDTO>>(
      `/inventory/products/${id}`,
      payload,
      {
        branchScope: "none",
      },
    );
    return mapProductDTO(data.data);
  },

  // 2. Stock Balances
  async getBranchStock(
    params?: StockFilters,
  ): Promise<PaginatedResponse<StockBalance>> {
    const { data } = await apiClient.get<PaginatedResponse<RawStockBalanceDTO>>(
      "/inventory/stock",
      {
        params,
        branchScope: params?.branchId
          ? { type: "branch", branchId: params.branchId }
          : "current",
      },
    );
    return {
      ...data,
      data: (data.data || []).map(mapStockBalanceDTO),
    };
  },

  // 3. Manual Salon Consumption
  async recordConsumption(
    payload: ManualConsumptionInput,
    idempotencyKey?: string,
  ): Promise<{ balance: StockBalance; movement: StockMovement }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const { data } = await apiClient.post<
      ApiResponse<{
        balance: RawStockBalanceDTO;
        movement: RawStockMovementDTO;
      }>
    >("/inventory/consume", payload, {
      headers,
      branchScope: { type: "branch", branchId: payload.branchId },
    });

    return {
      balance: mapStockBalanceDTO(data.data.balance),
      movement: mapStockMovementDTO(data.data.movement),
    };
  },

  // 4. Stock Adjustment
  async recordAdjustment(
    payload: StockAdjustmentInput,
    idempotencyKey?: string,
  ): Promise<{ balance: StockBalance; movement: StockMovement }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const { data } = await apiClient.post<
      ApiResponse<{
        balance: RawStockBalanceDTO;
        movement: RawStockMovementDTO;
      }>
    >("/inventory/adjust", payload, {
      headers,
      branchScope: { type: "branch", branchId: payload.branchId },
    });

    return {
      balance: mapStockBalanceDTO(data.data.balance),
      movement: mapStockMovementDTO(data.data.movement),
    };
  },

  // 5. Inter-Branch Transfer
  async recordTransfer(
    payload: StockTransferInput,
    idempotencyKey?: string,
  ): Promise<{
    sourceBalance: StockBalance;
    destBalance: StockBalance;
    outMovement: StockMovement;
    inMovement: StockMovement;
  }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const { data } = await apiClient.post<
      ApiResponse<{
        sourceBalance: RawStockBalanceDTO;
        destBalance: RawStockBalanceDTO;
        outMovement: RawStockMovementDTO;
        inMovement: RawStockMovementDTO;
      }>
    >("/inventory/transfer", payload, {
      headers,
      branchScope: { type: "branch", branchId: payload.fromBranchId },
    });

    return {
      sourceBalance: mapStockBalanceDTO(data.data.sourceBalance),
      destBalance: mapStockBalanceDTO(data.data.destBalance),
      outMovement: mapStockMovementDTO(data.data.outMovement),
      inMovement: mapStockMovementDTO(data.data.inMovement),
    };
  },

  // 6. Stock Movements History
  async getMovements(
    params?: MovementFilters,
  ): Promise<PaginatedResponse<StockMovement>> {
    const { data } = await apiClient.get<
      PaginatedResponse<RawStockMovementDTO>
    >("/inventory/movements", {
      params,
      branchScope: params?.branchId
        ? { type: "branch", branchId: params.branchId }
        : "current",
    });
    return {
      ...data,
      data: (data.data || []).map(mapStockMovementDTO),
    };
  },
};
