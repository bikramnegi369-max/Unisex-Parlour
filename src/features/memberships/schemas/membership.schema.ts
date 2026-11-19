import { z } from "zod";

export const membershipPlanFormSchema = z.object({
  name: z.string().trim().min(2, "Plan name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Code must be at least 2 characters").max(20).toUpperCase().optional().or(z.literal("")),
  tier: z.string().trim().min(1, "Tier is required"),
  description: z.string().trim().max(1000).optional().default(""),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  validityMonths: z.coerce.number().int().min(1, "Validity must be at least 1 month"),
  maxBeneficiaries: z.coerce.number().int().min(1, "Must allow at least 1 beneficiary").default(1),
  serviceDiscountPercentage: z.coerce.number().min(0).max(100, "Cannot exceed 100%").default(0),
  productDiscountPercentage: z.coerce.number().min(0).max(100, "Cannot exceed 100%").default(0),
  complimentaryPerks: z.array(z.string().trim().min(1)).optional().default([]),
  isActive: z.boolean().default(true),
});

export type MembershipPlanFormValues = z.infer<typeof membershipPlanFormSchema>;

export const sellMembershipFormSchema = z.object({
  membershipPlanId: z.string().min(1, "Please select a membership plan"),
  payerCustomerId: z.string().min(1, "Please select a paying customer"),
  beneficiaryCustomerIds: z.array(z.string().min(1)).min(1, "At least one beneficiary is required"),
  soldByStaffId: z.string().optional().or(z.literal("")),
  notes: z.string().max(1000).optional().default(""),
});

export type SellMembershipFormValues = z.infer<typeof sellMembershipFormSchema>;
