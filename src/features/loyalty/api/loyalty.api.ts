import { apiClient } from "@/lib/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/types/api.types";
import type {
  LoyaltyProgramConfig,
  LoyaltyLedgerTransaction,
  LoyaltyLedgerQuery,
  LoyaltyAdjustmentPayload,
  LoyaltyAdjustmentResponse,
  RedemptionPreviewParams,
  RedemptionPreviewResult,
} from "../types/loyalty.types";

const toFlatId = (val: unknown): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (typeof obj._id === "string") return obj._id;
    if (typeof obj.id === "string") return obj.id;
    return String(obj._id || obj.id || "");
  }
  return String(val);
};

export const normalizeLoyaltyTransaction = (
  raw: Record<string, unknown>
): LoyaltyLedgerTransaction => {
  const id = toFlatId(raw._id || raw.id);
  const customerId = toFlatId(raw.customerId);
  const organizationId = toFlatId(raw.organizationId);
  const branchId = toFlatId(raw.branchId);

  // Extract populated branch object
  let branch = null;
  if (typeof raw.branchId === "object" && raw.branchId !== null) {
    const brObj = raw.branchId as Record<string, unknown>;
    branch = {
      id: toFlatId(brObj._id || brObj.id || branchId),
      name: (brObj.name as string) || "Branch",
    };
  } else if (branchId) {
    branch = {
      id: branchId,
      name: "Branch",
    };
  }

  // Extract populated invoice object
  let invoice = null;
  if (typeof raw.invoiceId === "object" && raw.invoiceId !== null) {
    const invObj = raw.invoiceId as Record<string, unknown>;
    invoice = {
      id: toFlatId(invObj._id || invObj.id),
      invoiceNumber: (invObj.invoiceNumber as string) || `#INV-${toFlatId(invObj._id || invObj.id).slice(-6).toUpperCase()}`,
    };
  } else if (raw.invoiceId) {
    const invId = toFlatId(raw.invoiceId);
    invoice = {
      id: invId,
      invoiceNumber: `#INV-${invId.slice(-6).toUpperCase()}`,
    };
  }

  // Extract populated payment object
  let payment = null;
  if (typeof raw.paymentId === "object" && raw.paymentId !== null) {
    const payObj = raw.paymentId as Record<string, unknown>;
    payment = {
      id: toFlatId(payObj._id || payObj.id),
      paymentNumber: (payObj.paymentNumber as string) || `#PAY-${toFlatId(payObj._id || payObj.id).slice(-6).toUpperCase()}`,
    };
  } else if (raw.paymentId) {
    const payId = toFlatId(raw.paymentId);
    payment = {
      id: payId,
      paymentNumber: `#PAY-${payId.slice(-6).toUpperCase()}`,
    };
  }

  // Extract populated actor / staff
  let actor = null;
  if (typeof raw.actorId === "object" && raw.actorId !== null) {
    const actObj = raw.actorId as Record<string, unknown>;
    actor = {
      id: toFlatId(actObj._id || actObj.id),
      name: (actObj.name as string) || "Staff",
    };
  }

  // Extract rate snapshot
  let rateSnapshot = null;
  if (typeof raw.rateSnapshot === "object" && raw.rateSnapshot !== null) {
    const snap = raw.rateSnapshot as Record<string, unknown>;
    rateSnapshot = {
      earnThresholdAmount: typeof snap.earnThresholdAmount === "number" ? snap.earnThresholdAmount : null,
      earnPointsPerUnit: typeof snap.earnPointsPerUnit === "number" ? snap.earnPointsPerUnit : null,
      eligibleSpendAmount: typeof snap.eligibleSpendAmount === "number" ? snap.eligibleSpendAmount : null,
      redemptionRate: typeof snap.redemptionRate === "number" ? snap.redemptionRate : null,
    };
  }

  return {
    id,
    customerId,
    organizationId: organizationId || undefined,
    branchId: branchId || undefined,
    branch,
    type: (raw.type as LoyaltyLedgerTransaction["type"]) || "EARNED",
    pointsDelta: typeof raw.pointsDelta === "number" ? raw.pointsDelta : Number(raw.pointsDelta) || 0,
    balanceBefore: typeof raw.balanceBefore === "number" ? raw.balanceBefore : undefined,
    balanceAfter: typeof raw.balanceAfter === "number" ? raw.balanceAfter : Number(raw.balanceAfter) || 0,
    reason: (raw.reason as string) || "",
    referenceType: (raw.referenceType as LoyaltyLedgerTransaction["referenceType"]) || (invoice ? "invoice" : undefined),
    referenceId: invoice ? invoice.id : raw.referenceId ? toFlatId(raw.referenceId) : null,
    invoice,
    payment,
    actor,
    rateSnapshot,
    sourceEventKey: typeof raw.sourceEventKey === "string" ? raw.sourceEventKey : null,
    performedBy: actor || (raw.performedBy ? (raw.performedBy as LoyaltyLedgerTransaction["performedBy"]) : null),
    createdAt: (raw.createdAt as string) || new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) || undefined,
  };
};

/**
 * Fetch authoritative loyalty program configuration (organization scoped)
 */
export async function getLoyaltyProgram(): Promise<LoyaltyProgramConfig> {
  const { data } = await apiClient.get<ApiResponse<{ program?: Record<string, unknown> } | Record<string, unknown>>>(
    "/loyalty/program",
    { branchScope: "organization" }
  );

  const raw = (data.data && "program" in data.data && typeof data.data.program === "object"
    ? data.data.program
    : data.data) as Record<string, unknown> || {};

  return {
    id: toFlatId(raw._id || raw.id),
    _id: toFlatId(raw._id || raw.id),
    organizationId: toFlatId(raw.organizationId),
    isEnabled: typeof raw.isEnabled === "boolean" ? raw.isEnabled : false,
    earnThresholdAmount: typeof raw.earnThresholdAmount === "number" ? raw.earnThresholdAmount : 100,
    earnPointsPerUnit: typeof raw.earnPointsPerUnit === "number" ? raw.earnPointsPerUnit : 1,
    redemptionRate: typeof raw.redemptionRate === "number" ? raw.redemptionRate : 1,
    minRedemptionPoints: typeof raw.minRedemptionPoints === "number" ? raw.minRedemptionPoints : 20,
    maxRedemptionPercentage: typeof raw.maxRedemptionPercentage === "number" ? raw.maxRedemptionPercentage : 20,
    isConfigured: typeof raw.isConfigured === "boolean" ? raw.isConfigured : false,
    updatedAt: (raw.updatedAt as string) || undefined,
  };
}

/**
 * Update loyalty program configuration (organization scoped, requires loyalty.configure)
 */
export async function updateLoyaltyProgram(
  payload: Partial<LoyaltyProgramConfig>
): Promise<LoyaltyProgramConfig> {
  const backendBody = {
    isEnabled: payload.isEnabled,
    earnPointsPerUnit: payload.earnPointsPerUnit,
    earnThresholdAmount: payload.earnThresholdAmount,
    redemptionRate: payload.redemptionRate,
    minRedemptionPoints: payload.minRedemptionPoints,
    maxRedemptionPercentage: payload.maxRedemptionPercentage,
  };

  const { data } = await apiClient.put<ApiResponse<{ program?: Record<string, unknown> } | Record<string, unknown>>>(
    "/loyalty/program",
    backendBody,
    { branchScope: "organization" }
  );

  const raw = (data.data && "program" in data.data && typeof data.data.program === "object"
    ? data.data.program
    : data.data) as Record<string, unknown> || {};

  return {
    id: toFlatId(raw._id || raw.id),
    _id: toFlatId(raw._id || raw.id),
    organizationId: toFlatId(raw.organizationId),
    isEnabled: typeof raw.isEnabled === "boolean" ? raw.isEnabled : (payload.isEnabled ?? false),
    earnThresholdAmount: typeof raw.earnThresholdAmount === "number" ? raw.earnThresholdAmount : (payload.earnThresholdAmount ?? 100),
    earnPointsPerUnit: typeof raw.earnPointsPerUnit === "number" ? raw.earnPointsPerUnit : (payload.earnPointsPerUnit ?? 1),
    redemptionRate: typeof raw.redemptionRate === "number" ? raw.redemptionRate : (payload.redemptionRate ?? 1),
    minRedemptionPoints: typeof raw.minRedemptionPoints === "number" ? raw.minRedemptionPoints : (payload.minRedemptionPoints ?? 20),
    maxRedemptionPercentage: typeof raw.maxRedemptionPercentage === "number" ? raw.maxRedemptionPercentage : (payload.maxRedemptionPercentage ?? 20),
    isConfigured: typeof raw.isConfigured === "boolean" ? raw.isConfigured : true,
    updatedAt: (raw.updatedAt as string) || undefined,
  };
}

/**
 * Fetch paginated customer loyalty ledger history
 */
export async function getCustomerLoyaltyLedger(
  customerId: string,
  query: LoyaltyLedgerQuery = {}
): Promise<PaginatedResponse<LoyaltyLedgerTransaction>> {
  const { data } = await apiClient.get<{
    success: boolean;
    status: string;
    message?: string;
    data: Record<string, unknown>[];
    pagination?: {
      total: number;
      page: string | number;
      limit: string | number;
      pages: number;
    };
    meta?: {
      total: number;
      page: string | number;
      limit: string | number;
      totalPages: number;
    };
  }>(`/loyalty/customers/${customerId}/ledger`, {
    params: query,
    branchScope: "organization",
  });

  const pagination = data.pagination || data.meta;
  const meta = pagination
    ? {
        total: typeof pagination.total === "number" ? pagination.total : Number(pagination.total) || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: "pages" in pagination ? pagination.pages : (pagination as { totalPages: number }).totalPages || 1,
      }
    : undefined;

  return {
    success: data.success,
    status: data.status,
    message: data.message,
    data: (data.data || []).map(normalizeLoyaltyTransaction),
    meta,
  };
}

/**
 * Perform manual points credit or debit adjustment (requires loyalty.adjust)
 * Backend contract: POST /api/v1/loyalty/customers/:customerId/adjust
 * Request body: { points, operation: 'CREDIT' | 'DEBIT', reason, idempotencyKey?, branchId? }
 */
export async function adjustCustomerLoyaltyPoints(
  customerId: string,
  payload: LoyaltyAdjustmentPayload
): Promise<LoyaltyAdjustmentResponse> {
  const requestBody: Record<string, unknown> = {
    points: payload.points,
    operation: payload.operation,
    reason: payload.reason,
  };

  if (payload.idempotencyKey) {
    requestBody.idempotencyKey = payload.idempotencyKey;
  }
  if (payload.branchId) {
    requestBody.branchId = payload.branchId;
  }

  const { data } = await apiClient.post<ApiResponse<Record<string, unknown>>>(
    `/loyalty/customers/${customerId}/adjust`,
    requestBody,
    {
      branchScope: "organization",
    }
  );

  const resData = data.data || {};
  const rawCustomer = (resData.customer as Record<string, unknown>) || {};
  const rawTx = (resData.transaction as Record<string, unknown>) || resData;

  return {
    customer: {
      id: toFlatId(rawCustomer._id || rawCustomer.id || customerId),
      loyaltyPoints: typeof rawCustomer.loyaltyPoints === "number" ? rawCustomer.loyaltyPoints : Number(rawCustomer.loyaltyPoints) || 0,
      loyaltyPointsDebt: typeof rawCustomer.loyaltyPointsDebt === "number" ? rawCustomer.loyaltyPointsDebt : undefined,
    },
    transaction: normalizeLoyaltyTransaction(rawTx),
    isIdempotentReplay: Boolean(resData.isIdempotentReplay),
  };
}

/**
 * Authoritative read-only redemption preview for billing/POS
 * Backend contract: GET /api/v1/loyalty/preview-redemption?customerId=...&pointsRequested=...&invoiceId=...
 */
export async function previewRedemption(
  params: RedemptionPreviewParams
): Promise<RedemptionPreviewResult> {
  const queryParams: Record<string, unknown> = {
    customerId: params.customerId,
  };
  if (params.pointsRequested !== undefined) {
    queryParams.pointsRequested = params.pointsRequested;
  }
  if (params.invoiceId) {
    queryParams.invoiceId = params.invoiceId;
  } else if (params.billAmount !== undefined) {
    queryParams.billAmount = params.billAmount;
  }

  const { data } = await apiClient.get<ApiResponse<Record<string, unknown>>>(
    "/loyalty/preview-redemption",
    {
      params: queryParams,
      branchScope: "current",
    }
  );

  const res = data.data || {};
  return {
    isEligible: typeof res.isEligible === "boolean" ? res.isEligible : true,
    reason: typeof res.reason === "string" ? res.reason : undefined,
    availablePoints: typeof res.availablePoints === "number" ? res.availablePoints : 0,
    maxRedeemablePoints: typeof res.maxRedeemablePoints === "number" ? res.maxRedeemablePoints : 0,
    maxRedemptionDiscount: typeof res.maxRedemptionDiscount === "number" ? res.maxRedemptionDiscount : 0,
    appliedPoints: typeof res.appliedPoints === "number" ? res.appliedPoints : 0,
    appliedDiscount: typeof res.appliedDiscount === "number" ? res.appliedDiscount : 0,
    effectivePayable: typeof res.effectivePayable === "number" ? res.effectivePayable : 0,
  };
}
