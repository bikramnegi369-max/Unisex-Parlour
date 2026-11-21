import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerMembershipDetailsModal } from "../components/CustomerMembershipDetailsModal";
import type { CustomerMembership } from "../types/membership.types";

vi.mock("@/features/branches/hooks/useBranches", () => ({
  useBranches: () => ({
    branches: [
      { id: "branch-1", name: "Downtown Branch" },
      { id: "branch-2", name: "Uptown Branch" },
    ],
  }),
}));

const mockPurchaseGroup = {
  purchaseId: "purchase-123",
  payerCustomerId: "cust-payer",
  members: [
    {
      id: "mem-1",
      membershipCode: "MEM-GOLD-001",
      status: "pending_payment",
      customerId: {
        id: "cust-payer",
        name: "Alice Smith (Payer)",
        phone: "+91 9876543210",
      },
      payerCustomerId: "cust-payer",
      isPrimary: true,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2027-01-01T00:00:00.000Z",
      permittedBranchIds: ["branch-1"],
      planSnapshot: {
        name: "Gold Family Pass",
        tier: "Gold",
        price: 5000,
        validityMonths: 12,
        benefits: {
          serviceDiscountPercentage: 20,
          productDiscountPercentage: 10,
          complimentaryPerks: ["Free Hair Spa"],
        },
      },
      invoiceId: {
        id: "inv-999",
        invoiceNumber: "INV-2026-001",
        paymentStatus: "unpaid",
      },
    },
    {
      id: "mem-2",
      membershipCode: "MEM-GOLD-002",
      status: "pending_payment",
      customerId: {
        id: "cust-ben-2",
        name: "Bob Smith (Son)",
        phone: "+91 9876543211",
      },
      payerCustomerId: "cust-payer",
      isPrimary: false,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2027-01-01T00:00:00.000Z",
      permittedBranchIds: ["branch-1"],
      planSnapshot: {
        name: "Gold Family Pass",
        tier: "Gold",
        price: 5000,
        validityMonths: 12,
        benefits: {
          serviceDiscountPercentage: 15,
          productDiscountPercentage: 10,
          complimentaryPerks: ["Free Blow Dry"],
        },
      },
    },
    {
      id: "mem-3",
      membershipCode: "MEM-GOLD-003",
      status: "pending_payment",
      customerId: {
        id: "cust-ben-3",
        name: "Charlie Smith (Daughter)",
        phone: "+91 9876543212",
      },
      payerCustomerId: "cust-payer",
      isPrimary: false,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2027-01-01T00:00:00.000Z",
      permittedBranchIds: ["branch-1"],
      planSnapshot: {
        name: "Gold Family Pass",
        tier: "Gold",
        price: 5000,
        validityMonths: 12,
        benefits: {
          serviceDiscountPercentage: 25,
          productDiscountPercentage: 15,
          complimentaryPerks: ["VIP Lounge Access"],
        },
      },
    },
  ],
};

vi.mock("../hooks/useMemberships", () => ({
  useMembershipPurchaseGroup: (id: string) => ({
    data: id === "mem-1" ? mockPurchaseGroup : null,
    isLoading: false,
  }),
  useMembershipUsageHistory: () => ({
    data: {
      usage: [
        {
          id: "usage-1",
          invoiceNumber: "INV-2026-001",
          itemName: "Deluxe Haircut",
          itemType: "service",
          quantity: 1,
          membershipDiscountAmount: 300,
          finalPrice: 700,
          usedAt: "2026-06-15T00:00:00.000Z",
          branch: { name: "Downtown Branch" },
        },
      ],
    },
    isLoading: false,
  }),
  useTriggerRenewalReminder: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true, deliveryOutcome: "dispatched" }),
    isPending: false,
  }),
}));

describe("CustomerMembershipDetailsModal - Multi-Beneficiary & Snapshot Verification", () => {
  it("renders exact persisted enrollment terms, 3 beneficiaries roster, payer link and payment status", () => {
    const primaryMembership = mockPurchaseGroup.members[0] as unknown as CustomerMembership;

    render(
      <CustomerMembershipDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        membership={primaryMembership}
      />
    );

    // 1. Plan and Code
    expect(screen.getByText("Gold Family Pass")).toBeInTheDocument();
    expect(screen.getByText("MEM-GOLD-001")).toBeInTheDocument();
    expect(screen.getByText("Gold Tier")).toBeInTheDocument();
    expect(screen.getByText("Pending Payment")).toBeInTheDocument();

    // 2. Multi-beneficiary roster displays all 3 enrolled beneficiaries
    expect(screen.getByText("Enrolled Beneficiaries (3)")).toBeInTheDocument();
    expect(screen.getAllByText("Alice Smith (Payer)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Bob Smith (Son)")).toBeInTheDocument();
    expect(screen.getByText("Charlie Smith (Daughter)")).toBeInTheDocument();

    // 3. Primary member vs additional beneficiary badges
    expect(screen.getByText("Primary Member")).toBeInTheDocument();

    // 4. Payer attribution
    expect(screen.getByText("Payer / Account Owner")).toBeInTheDocument();
    expect(screen.getByText("+91 9876543210")).toBeInTheDocument();

    // 5. Financials and Invoice link
    expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    expect(screen.getByText("unpaid")).toBeInTheDocument();

    // 6. Branch eligibility
    expect(screen.getByText("Downtown Branch")).toBeInTheDocument();

    // 7. Benefits of active tab (Primary: 20% Svcs, 10% Prods)
    expect(screen.getByText("20% OFF")).toBeInTheDocument();
    expect(screen.getByText("Free Hair Spa")).toBeInTheDocument();

    // 8. Switch to Beneficiary #3 (Charlie: 25% Svcs, VIP Lounge Access)
    fireEvent.click(screen.getByText("Charlie Smith (Daughter)"));
    expect(screen.getByText("25% OFF")).toBeInTheDocument();
    expect(screen.getByText("VIP Lounge Access")).toBeInTheDocument();
    expect(screen.getByText("Additional Beneficiary")).toBeInTheDocument();
  });
});
