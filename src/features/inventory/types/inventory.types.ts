export type ProductUsageType = "retail_sale" | "salon_consumption" | "both";

export type StockUnit =
  | "piece"
  | "bottle"
  | "box"
  | "pack"
  | "kit"
  | "ml"
  | "l"
  | "g"
  | "kg";

export const DISCRETE_STOCK_UNITS: StockUnit[] = ["piece", "bottle", "box", "pack", "kit"];
export const CONTINUOUS_STOCK_UNITS: StockUnit[] = ["ml", "l", "g", "kg"];

export type MovementType =
  | "purchase_in"
  | "pos_sale"
  | "service_consumption"
  | "adjustment"
  | "transfer_out"
  | "transfer_in"
  | "stocktake";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  usageType: ProductUsageType;
  stockUnit: StockUnit;
  costPrice: number;
  sellingPrice: number;
  reorderLevel: number;
  status: "active" | "inactive";
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockBalance {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  product?: Product;
  onHand: number;
  allocated: number;
  lastMovementAt: string;
  isLowStock?: boolean;
}

export interface StockMovement {
  id: string;
  organizationId: string;
  branchId: string;
  productId: string;
  product?: Product;
  quantityDelta: number;
  balanceAfter: number;
  movementType: MovementType;
  referenceType?: string;
  referenceId?: string;
  balanceBefore?: number;
  reference?: {
    entityType: string;
    entityId?: string;
    identifier?: string;
  };
  actorId: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
  notes?: string;
  createdAt: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  usageType?: ProductUsageType;
  status?: "active" | "inactive";
  search?: string;
}

export interface StockFilters {
  branchId?: string;
  page?: number;
  limit?: number;
  lowStock?: "true" | "false";
  search?: string;
}

export interface MovementFilters {
  branchId?: string;
  productId?: string;
  movementType?: MovementType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
