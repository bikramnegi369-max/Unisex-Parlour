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

export type CustomerMembershipStatus = "pending_payment" | "active" | "expired" | "cancelled";

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
    benefits: MembershipBenefits;
  };
  status: CustomerMembershipStatus;
  startDate: string;
  endDate: string;
  permittedBranchIds?: string[];
  invoiceId?: string | { id?: string; _id?: string; invoiceNumber?: string; paymentStatus?: string; payableAmount?: number };
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface UpdateMembershipPlanPayload extends Partial<CreateMembershipPlanPayload> {}

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
  membershipPlanId: string;
  payerCustomerId: string;
  beneficiaryCustomerIds: string[];
  beneficiaries?: Array<{
    customerId: string;
    benefits?: Partial<MembershipBenefits>;
  }>;
  soldByStaffId?: string;
  notes?: string;
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
