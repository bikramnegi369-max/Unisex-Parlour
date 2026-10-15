export type LoyaltyTransactionType =
  | "EARNED"
  | "REDEEMED"
  | "ADJUSTED"
  | "EARNING_REVERSED"
  | "REDEMPTION_RESTORED";

export interface LoyaltyProgramConfig {
  id?: string;
  _id?: string;
  organizationId?: string;
  isEnabled: boolean;
  earnPointsPerUnit: number; // default 1
  earnThresholdAmount: number; // default 100
  redemptionRate: number; // ₹ per point, default 1
  minRedemptionPoints: number; // default 20
  maxRedemptionPercentage: number; // max % of bill, default 20
  isConfigured?: boolean;
  updatedAt?: string;
}

export interface LoyaltyRateSnapshot {
  earnThresholdAmount?: number | null;
  earnPointsPerUnit?: number | null;
  eligibleSpendAmount?: number | null;
  redemptionRate?: number | null;
}

export interface LoyaltyLedgerTransaction {
  id: string;
  _id?: string;
  customerId: string;
  organizationId?: string;
  branchId?: string;
  branch?: {
    id: string;
    name: string;
  } | null;
  type: LoyaltyTransactionType;
  pointsDelta: number; // positive for credits/earning, negative for debits/redemptions
  balanceBefore?: number;
  balanceAfter: number;
  reason: string;
  referenceType?: "invoice" | "manual" | "system" | "payment_void";
  referenceId?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
  } | null;
  payment?: {
    id: string;
    paymentNumber: string;
  } | null;
  actor?: {
    id: string;
    name: string;
  } | null;
  performedBy?: {
    id: string;
    name: string;
    email?: string;
  } | string | null;
  rateSnapshot?: LoyaltyRateSnapshot | null;
  sourceEventKey?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface LoyaltyLedgerQuery {
  page?: number;
  limit?: number;
  type?: LoyaltyTransactionType;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface LoyaltyAdjustmentPayload {
  points: number;
  operation: "CREDIT" | "DEBIT";
  reason: string;
  idempotencyKey?: string;
  branchId?: string;
}

export interface LoyaltyAdjustmentResponse {
  customer: {
    id: string;
    loyaltyPoints: number;
    loyaltyPointsDebt?: number;
  };
  transaction: LoyaltyLedgerTransaction;
  isIdempotentReplay?: boolean;
}

export interface RedemptionPreviewParams {
  customerId: string;
  pointsRequested?: number;
  invoiceId?: string;
  billAmount?: number;
}

export interface RedemptionPreviewResult {
  isEligible: boolean;
  reason?: string;
  availablePoints: number;
  maxRedeemablePoints: number;
  maxRedemptionDiscount: number;
  appliedPoints: number;
  appliedDiscount: number;
  effectivePayable: number;
}

