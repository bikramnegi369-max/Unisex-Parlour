export type MembershipTier = "Standard" | "Silver" | "Gold" | "Platinum" | "VIP" | string;

export interface MembershipBenefits {
  serviceDiscountPercentage: number;
  productDiscountPercentage: number;
  eligibleServiceCategoryIds?: string[];
  eligibleServiceIds?: string[];
  excludedServiceCategoryIds?: string[];
  excludedServiceIds?: string[];
  complimentaryPerks: string[];
}

export interface MembershipPlan {
  id: string;
  _id?: string;
  organizationId: string;
  name: string;
  code?: string | null;
  tier: MembershipTier;
  description?: string;
  termsAndConditions?: string;
  price: number;
  validityMonths: number;
  validityUnit?: "days" | "months" | "years";
  validityDuration?: number;
  maxBeneficiaries: number;
  benefits: MembershipBenefits;
  beneficiaryPolicy?: {
    allowMultipleBeneficiaries?: boolean;
    maxBeneficiaries?: number;
    payerMustBeBeneficiary?: boolean;
    allowBeneficiaryChanges?: boolean;
  };
  permittedBranchIds?: string[];
  isCustom?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomerMembershipStatus = "pending_payment" | "active" | "suspended" | "expired" | "cancelled";

export interface MembershipPurchaseGroup {
  membershipPurchaseId: string;
  referenceMembershipId: string;
  membershipPlanId: string;
  planName: string;
  tier: string;
  maxBeneficiaries: number;
  enrolledCount: number;
  availableSlots: number;
  isCapacityReached: boolean;
  members: CustomerMembership[];
}

export interface CustomerMembership {
  id: string;
  _id?: string;
  organizationId: string;
  customerId: string | { id?: string; _id?: string; name?: string; phone?: string; email?: string };
  customer?: { id: string; name: string; phone: string; email?: string };
  payerCustomerId: string | { id?: string; _id?: string; name?: string; phone?: string; email?: string };
  payer?: { id: string; name: string; phone: string; email?: string };
  membershipPurchaseId?: string;
  membershipPlanId: string | { id?: string; _id?: string; name?: string; code?: string; tier?: string; price?: number };
  membershipCode: string;
  planSnapshot: {
    name: string;
    tier: string;
    price: number;
    validityMonths: number;
    maxBeneficiaries?: number;
    benefits: MembershipBenefits;
  };
  status: CustomerMembershipStatus;
  startDate: string;
  endDate: string;
  permittedBranchIds?: string[];
  isPrimary?: boolean;
  invoiceId?: string | { id?: string; _id?: string; invoiceNumber?: string; paymentStatus?: string; payableAmount?: number };
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  renewalReminder?: {
    status?: "none" | "scheduled" | "sent" | "failed";
    sentAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
    channel?: "sms" | "email" | "both";
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipUsageRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  paymentStatus: string;
  usedAt: string;
  branch?: { id: string; name: string; code: string } | null;
  customer?: { id: string; name: string; phone: string } | null;
  itemType: string;
  itemId?: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  benefitType: string;
  membershipDiscountAmount: number;
  finalPrice: number;
}

export interface MembershipUsageHistoryResponse {
  membership: {
    id: string;
    membershipCode: string;
    status: CustomerMembershipStatus;
    planName: string;
    tier: string;
    beneficiary?: { _id?: string; id?: string; name?: string; phone?: string };
    payer?: { _id?: string; id?: string; name?: string; phone?: string };
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  usage: MembershipUsageRecord[];
}

export interface CreateMembershipPlanPayload {
  name: string;
  code?: string | null;
  tier?: string;
  description?: string;
  termsAndConditions?: string;
  price: number;
  validityMonths: number;
  validityUnit?: "days" | "months" | "years";
  validityDuration?: number;
  maxBeneficiaries?: number;
  benefits?: {
    serviceDiscountPercentage?: number;
    productDiscountPercentage?: number;
    eligibleServiceCategoryIds?: string[];
    eligibleServiceIds?: string[];
    excludedServiceCategoryIds?: string[];
    excludedServiceIds?: string[];
    complimentaryPerks?: string[];
  };
  beneficiaryPolicy?: {
    allowMultipleBeneficiaries?: boolean;
    maxBeneficiaries?: number;
    payerMustBeBeneficiary?: boolean;
    allowBeneficiaryChanges?: boolean;
  };
  permittedBranchIds?: string[];
  isCustom?: boolean;
  isActive?: boolean;
}

export type UpdateMembershipPlanPayload = Partial<CreateMembershipPlanPayload>;

export interface CustomerActiveBenefits {
  hasActiveMembership: boolean;
  membershipId: string | null;
  status?: CustomerMembershipStatus;
  membershipCode?: string;
  planSnapshot?: {
    name?: string;
    tier?: string;
    price?: number;
    validityMonths?: number;
    benefits?: MembershipBenefits;
  };
  startDate?: string;
  endDate?: string;
  permittedBranchIds?: string[];
}

export interface QueryMembershipPlansParams {
  search?: string;
  tier?: string;
  isActive?: "true" | "false";
  isCustom?: "true" | "false";
  includeCustom?: "true" | "false";
  page?: number;
  limit?: number;
}

export interface QueryCustomerMembershipsParams {
  customerId?: string;
  payerCustomerId?: string;
  status?: CustomerMembershipStatus;
  membershipPlanId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BeneficiaryMemberConfig {
  customerId: string;
  benefits?: Partial<MembershipBenefits>;
  isCustomized?: boolean;
}

export interface EnrolledBeneficiaryState {
  customerId: string;
  isPrimary?: boolean;
  benefits?: Partial<MembershipBenefits>;
  isCustomized?: boolean;
}

export interface SellMembershipCheckoutPayload {
  membershipPlanId?: string;
  planId?: string;
  payerCustomerId: string;
  beneficiaryCustomerIds: string[];
  beneficiaries?: Array<{
    customerId: string;
    benefits?: Partial<MembershipBenefits>;
  }>;
  branchId?: string | null;
  soldByStaffId?: string;
  notes?: string;
  billImmediately?: boolean;
  customPlan?: CreateMembershipPlanPayload;
}

export interface SellMembershipResponseData {
  success: boolean;
  membershipPurchaseId: string;
  membershipPlanId: string;
  planName: string;
  payerCustomerId: string;
  status: CustomerMembershipStatus;
  customerMemberships: CustomerMembership[];
  customerMembership: CustomerMembership;
  invoice?: {
    id: string;
    invoiceNumber: string;
    paymentStatus: string;
    payableAmount: number;
    amountPaid: number;
  } | null;
}

export interface MembershipReportsSummary {
  totalMemberships: number;
  activeMemberships: number;
  expiredMemberships: number;
  cancelledMemberships: number;
  suspendedMemberships: number;
  pendingPaymentCount: number;
  soldThisMonthCount: number;
  expiringSoonCount: number;
  totalRevenue: number;
  uniqueBeneficiariesCount: number;
  activePlansCount: number;
}
