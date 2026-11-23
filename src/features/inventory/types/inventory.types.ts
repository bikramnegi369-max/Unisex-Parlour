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
  onHandConsumables?: number;
  onHandRetail?: number;
  onHandUnallocated?: number;
  allocated: number;
  allocatedConsumables?: number;
  allocatedRetail?: number;
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

export type StocktakeStatus =
  | "draft"
  | "in_progress"
  | "posting"
  | "completed"
  | "cancelled";

export type StocktakeTargetDomain =
  | "all"
  | "salon_consumables"
  | "retail_products";

export type StocktakeItemStatus =
  | "uncounted"
  | "counted"
  | "recount_required"
  | "posted";

export interface StocktakeItem {
  id: string;
  stocktakeId: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockUnit: StockUnit;
    category?: string;
    usageType?: ProductUsageType;
    status?: string;
  };
  stockDomain: "salon_consumables" | "retail_products";
  stockUnit: StockUnit;
  snapshotQuantity: number;
  snapshotMovementAt?: string;
  countedQuantity: number | null;
  countedAt?: string;
  verifiedMovementAt?: string;
  countedBy?: string | { id: string; name: string };
  systemQuantityAtPost?: number | null;
  varianceQuantity?: number | null;
  status: StocktakeItemStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stocktake {
  id: string;
  organizationId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    branchCode?: string;
  };
  stocktakeNumber: string;
  status: StocktakeStatus;
  title: string;
  targetDomain: StocktakeTargetDomain;
  initiatedBy: string | { id: string; name: string; email?: string };
  postedBy?: string | { id: string; name: string; email?: string } | null;
  postedAt?: string | null;
  totalItems: number;
  countedItemsCount: number;
  discrepancyCount: number;
  notes?: string;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt?: string;
  items?: StocktakeItem[];
}

export interface StocktakeFilters {
  branchId?: string;
  status?: StocktakeStatus;
  targetDomain?: StocktakeTargetDomain;
  page?: number;
  limit?: number;
}

export interface StocktakeDiscrepancyItem {
  itemId: string;
  productId: string;
  productName: string;
  sku: string;
  stockDomain: "salon_consumables" | "retail_products";
  stockUnit: StockUnit;
  snapshotQuantity: number;
  liveBalance: number;
  countedQuantity: number | null;
  varianceAgainstSnapshot: number | null;
  varianceAgainstLive: number | null;
  status: StocktakeItemStatus;
  hasInterveningMovement: boolean;
  notes?: string;
}

export interface StocktakeDiscrepancySummary {
  stocktakeId: string;
  stocktakeNumber: string;
  status: StocktakeStatus;
  totalItems: number;
  countedItems: number;
  uncountedItems: number;
  discrepantItems: number;
  matchedItems: number;
  recountRequiredCount: number;
  canPost: boolean;
  blockers: string[];
  discrepancies: StocktakeDiscrepancyItem[];
}

export interface CreateStocktakeInput {
  title?: string;
  targetDomain?: StocktakeTargetDomain;
  notes?: string;
  branchId?: string;
}

export interface RecordStocktakeCountItem {
  productId: string;
  stockDomain: "salon_consumables" | "retail_products";
  countedQuantity: number;
  notes?: string;
}

export interface RecordStocktakeCountsInput {
  items: RecordStocktakeCountItem[];
}
