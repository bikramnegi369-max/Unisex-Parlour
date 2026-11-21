import { describe, it, expect } from "vitest";
import { isServiceEligibleForMembershipBenefits } from "./membershipEligibility";

describe("isServiceEligibleForMembershipBenefits", () => {
  it("returns false if benefits are missing or null", () => {
    expect(isServiceEligibleForMembershipBenefits({ id: "srv-1" }, null)).toBe(false);
    expect(isServiceEligibleForMembershipBenefits({ id: "srv-1" }, undefined)).toBe(false);
  });

  it("qualifies any service when no inclusion/exclusion filters are defined", () => {
    const benefits = {
      serviceDiscountPercentage: 10,
      productDiscountPercentage: 0,
      complimentaryPerks: [],
    };
    expect(isServiceEligibleForMembershipBenefits({ id: "srv-1", categoryId: "cat-1" }, benefits)).toBe(true);
  });

  it("qualifies service when lists are empty arrays", () => {
    const benefits = {
      serviceDiscountPercentage: 10,
      productDiscountPercentage: 0,
      complimentaryPerks: [],
      eligibleServiceIds: [],
      eligibleServiceCategoryIds: [],
      excludedServiceIds: [],
      excludedServiceCategoryIds: [],
    };
    expect(isServiceEligibleForMembershipBenefits({ _id: "srv-1", categoryId: { _id: "cat-1" } }, benefits)).toBe(true);
  });

  describe("Precedence: Exclusions take absolute precedence", () => {
    it("returns false if serviceId is in excludedServiceIds even if category is eligible", () => {
      const benefits = {
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 0,
        complimentaryPerks: [],
        eligibleServiceCategoryIds: ["cat-1"],
        excludedServiceIds: ["srv-1"],
      };
      expect(isServiceEligibleForMembershipBenefits({ id: "srv-1", categoryId: "cat-1" }, benefits)).toBe(false);
    });

    it("returns false if categoryId is in excludedServiceCategoryIds even if serviceId is in eligibleServiceIds", () => {
      const benefits = {
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 0,
        complimentaryPerks: [],
        eligibleServiceIds: ["srv-1"],
        excludedServiceCategoryIds: ["cat-1"],
      };
      expect(isServiceEligibleForMembershipBenefits({ id: "srv-1", categoryId: "cat-1" }, benefits)).toBe(false);
    });

    it("handles populated object IDs in exclusions and service objects", () => {
      const benefits = {
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 0,
        complimentaryPerks: [],
        excludedServiceIds: [{ _id: "srv-99" } as any],
        excludedServiceCategoryIds: [{ id: "cat-99" } as any],
      };

      expect(isServiceEligibleForMembershipBenefits({ serviceId: "srv-99", categoryId: "cat-1" }, benefits)).toBe(false);
      expect(isServiceEligibleForMembershipBenefits({ id: "srv-2", categoryId: { _id: "cat-99" } }, benefits)).toBe(false);
    });
  });

  describe("Inclusions: matching eligible service or category", () => {
    it("returns true when serviceId matches eligibleServiceIds", () => {
      const benefits = {
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 0,
        complimentaryPerks: [],
        eligibleServiceIds: ["srv-1"],
        eligibleServiceCategoryIds: ["cat-99"],
      };
      expect(isServiceEligibleForMembershipBenefits({ id: "srv-1", categoryId: "cat-2" }, benefits)).toBe(true);
    });

    it("returns true when categoryId matches eligibleServiceCategoryIds", () => {
      const benefits = {
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 0,
        complimentaryPerks: [],
        eligibleServiceCategoryIds: ["cat-1"],
      };
      expect(isServiceEligibleForMembershipBenefits({ id: "srv-random", categoryId: { id: "cat-1" } }, benefits)).toBe(true);
    });

    it("returns false if inclusion criteria exist but service does not match any", () => {
      const benefits = {
        serviceDiscountPercentage: 10,
        productDiscountPercentage: 0,
        complimentaryPerks: [],
        eligibleServiceIds: ["srv-10"],
        eligibleServiceCategoryIds: ["cat-10"],
      };
      expect(isServiceEligibleForMembershipBenefits({ id: "srv-99", categoryId: "cat-99" }, benefits)).toBe(false);
    });
  });
});
