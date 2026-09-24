// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SubscriptionTable } from "../components/SubscriptionTable";
import { getSubscriptionColumns } from "../columns/subscription.columns";
import type { Subscription } from "../types/subscription.types";

const mockSubscriptions: Subscription[] = [
  {
    id: "sub_1",
    subscriptionCode: "SUB-001",
    organizationId: "org_1",
    customerId: "cust_1",
    customer: {
      id: "cust_1",
      name: "Emma Watson",
      phone: "+91 98765 43210",
    },
    price: 3500,
    status: "active",
    permittedBranchIds: ["br_1"],
    entitlements: [
      {
        serviceId: "srv_1",
        serviceName: "Hair Spa",
        totalQuantity: 3,
        usedQuantity: 1,
        remainingQuantity: 2,
      },
    ],
    startDate: "2026-09-01",
    endDate: "2027-03-01",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: "sub_2",
    subscriptionCode: "SUB-002",
    organizationId: "org_1",
    customerId: "cust_2",
    customer: {
      id: "cust_2",
      name: "John Doe",
      phone: "+91 98765 43211",
    },
    price: 6000,
    status: "exhausted",
    permittedBranchIds: [],
    entitlements: [
      {
        serviceId: "srv_2",
        serviceName: "Facial",
        totalQuantity: 2,
        usedQuantity: 2,
        remainingQuantity: 0,
      },
    ],
    startDate: "2026-08-01",
    endDate: "2027-02-01",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

describe("SubscriptionTable & Columns", () => {
  const onView = vi.fn();
  const onEdit = vi.fn();
  const onCancel = vi.fn();
  const onRedeem = vi.fn();
  const getBranchName = vi.fn((id) => (id === "br_1" ? "Downtown Branch" : id));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders subscriptions with code, customer name, price, and status badges", () => {
    const columns = getSubscriptionColumns({
      onView,
      onEdit,
      onCancel,
      onRedeem,
      canView: true,
      canEdit: true,
      canCancel: true,
      canRedeem: true,
      getBranchName,
    });

    render(
      <SubscriptionTable
        columns={columns}
        data={mockSubscriptions}
        isLoading={false}
        onView={onView}
        onEdit={onEdit}
        onCancel={onCancel}
        onRedeem={onRedeem}
        canView={true}
        canEdit={true}
        canCancel={true}
        canRedeem={true}
        getBranchName={getBranchName}
      />
    );

    // Verify Codes
    expect(screen.getAllByText("SUB-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SUB-002").length).toBeGreaterThan(0);

    // Verify Customers
    expect(screen.getAllByText("Emma Watson").length).toBeGreaterThan(0);
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);

    // Verify Status Badges
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Exhausted/i).length).toBeGreaterThan(0);

    // Verify Entitlement summary
    expect(screen.getByText("2 / 3 left")).not.toBeNull();
    expect(screen.getByText("0 / 2 left")).not.toBeNull();

    // Verify Permitted branch rendering
    expect(screen.getAllByText("Downtown Branch").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/All Branches/i).length).toBeGreaterThan(0);
  });

  it("gates actions according to user permissions", () => {
    // Render without redeem and configure permissions
    const restrictedColumns = getSubscriptionColumns({
      onView,
      onEdit,
      onCancel,
      onRedeem,
      canView: true,
      canEdit: false,
      canCancel: false,
      canRedeem: false,
      getBranchName,
    });

    render(
      <SubscriptionTable
        columns={restrictedColumns}
        data={mockSubscriptions}
        isLoading={false}
        onView={onView}
        onEdit={onEdit}
        onCancel={onCancel}
        onRedeem={onRedeem}
        canView={true}
        canEdit={false}
        canCancel={false}
        canRedeem={false}
        getBranchName={getBranchName}
      />
    );

    // Redeem, Edit, Cancel buttons should NOT be present
    expect(screen.queryByTitle("Redeem Entitlements")).toBeNull();
    expect(screen.queryByTitle("Edit Subscription")).toBeNull();
    expect(screen.queryByTitle("Cancel Subscription")).toBeNull();

    // View button should be visible
    const viewButtons = screen.getAllByTitle("View Subscription");
    expect(viewButtons.length).toBeGreaterThan(0);

    fireEvent.click(viewButtons[0]);
    expect(onView).toHaveBeenCalledWith(mockSubscriptions[0]);
  });
});
