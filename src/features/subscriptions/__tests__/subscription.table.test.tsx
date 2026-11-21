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

  it("displays separate payment status and allows redemption for pending_payment/unpaid subscriptions", () => {
    const unpaidSubscription: Subscription = {
      ...mockSubscriptions[0],
      id: "sub_unpaid",
      subscriptionCode: "SUB-UNPAID",
      status: "pending_payment",
      paymentStatus: "unpaid",
      isPaid: false,
    };

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
        data={[unpaidSubscription]}
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

    // Should display Pending Payment badge for subscription status and Unpaid for payment status
    expect(screen.getAllByText(/Pending Payment/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unpaid/i).length).toBeGreaterThan(0);

    // Redeem button should be accessible even for pending payment
    const redeemButtons = screen.getAllByTitle("Manual Redemption");
    expect(redeemButtons.length).toBeGreaterThan(0);
  });

  it("renders Renew button when canRenew is true and onRenew is provided", () => {
    const onRenew = vi.fn();
    const columns = getSubscriptionColumns({
      onView,
      onEdit,
      onCancel,
      onRedeem,
      onRenew,
      canView: true,
      canEdit: true,
      canCancel: true,
      canRedeem: true,
      canRenew: true,
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

    const renewButtons = screen.getAllByTitle("Renew Subscription");
    expect(renewButtons.length).toBe(mockSubscriptions.length);

    fireEvent.click(renewButtons[0]);
    expect(onRenew).toHaveBeenCalledWith(mockSubscriptions[0]);
  });

  describe("Invoice Lifecycle Actions and Visibilities", () => {
    it("renders 'Generate Separate Invoice' when subscription has no invoice", () => {
      const onGenerateInvoice = vi.fn();
      const uninvoicedSub: Subscription = {
        ...mockSubscriptions[0],
        id: "sub_uninvoiced",
        invoiceId: undefined,
      };

      const columns = getSubscriptionColumns({
        onView,
        onEdit,
        onCancel,
        onRedeem,
        onGenerateInvoice,
        canView: true,
        canEdit: true,
        canCancel: true,
        canRedeem: true,
        canGenerateInvoice: true,
        getBranchName,
      });

      render(
        <SubscriptionTable
          columns={columns}
          data={[uninvoicedSub]}
          isLoading={false}
          onView={onView}
          onEdit={onEdit}
          onCancel={onCancel}
          onRedeem={onRedeem}
          onGenerateInvoice={onGenerateInvoice}
          canView={true}
          canEdit={true}
          canCancel={true}
          canRedeem={true}
          canGenerateInvoice={true}
          getBranchName={getBranchName}
        />
      );

      const generateButtons = screen.getAllByTitle("Generate Separate Invoice");
      expect(generateButtons.length).toBeGreaterThan(0);
      fireEvent.click(generateButtons[0]);
      expect(onGenerateInvoice).toHaveBeenCalledWith(uninvoicedSub);
    });

    it("renders 'Generate New Invoice' when previous invoice was cancelled", () => {
      const onGenerateInvoice = vi.fn();
      const cancelledInvoiceSub: Subscription = {
        ...mockSubscriptions[0],
        id: "sub_cancelled_inv",
        invoiceId: {
          id: "inv_cancelled",
          status: "cancelled",
        },
        invoiceHistory: [
          {
            invoiceId: "inv_cancelled",
            invoiceNumber: "INV-001",
            status: "cancelled",
            issuedAt: "2026-09-01T00:00:00Z",
            cancelledAt: "2026-09-02T00:00:00Z",
          },
        ],
      };

      const columns = getSubscriptionColumns({
        onView,
        onEdit,
        onCancel,
        onRedeem,
        onGenerateInvoice,
        canView: true,
        canEdit: true,
        canCancel: true,
        canRedeem: true,
        canGenerateInvoice: true,
        getBranchName,
      });

      render(
        <SubscriptionTable
          columns={columns}
          data={[cancelledInvoiceSub]}
          isLoading={false}
          onView={onView}
          onEdit={onEdit}
          onCancel={onCancel}
          onRedeem={onRedeem}
          onGenerateInvoice={onGenerateInvoice}
          canView={true}
          canEdit={true}
          canCancel={true}
          canRedeem={true}
          canGenerateInvoice={true}
          getBranchName={getBranchName}
        />
      );

      const regenButtons = screen.getAllByTitle("Generate New Invoice (Replacement)");
      expect(regenButtons.length).toBeGreaterThan(0);
      fireEvent.click(regenButtons[0]);
      expect(onGenerateInvoice).toHaveBeenCalledWith(cancelledInvoiceSub);
    });

    it("renders 'View Invoice' link when subscription has active or paid invoice", () => {
      const activeInvoiceSub: Subscription = {
        ...mockSubscriptions[0],
        id: "sub_active_inv",
        invoiceId: {
          id: "inv_active_123",
          status: "draft",
          invoiceNumber: "INV-100",
        },
      };

      const columns = getSubscriptionColumns({
        onView,
        onEdit,
        onCancel,
        onRedeem,
        canView: true,
        canEdit: true,
        canCancel: true,
        canRedeem: true,
        canGenerateInvoice: true,
        getBranchName,
      });

      render(
        <SubscriptionTable
          columns={columns}
          data={[activeInvoiceSub]}
          isLoading={false}
          onView={onView}
          onEdit={onEdit}
          onCancel={onCancel}
          onRedeem={onRedeem}
          canView={true}
          canEdit={true}
          canCancel={true}
          canRedeem={true}
          canGenerateInvoice={true}
          getBranchName={getBranchName}
        />
      );

      const viewInvoiceLinks = screen.getAllByTitle("View Invoice");
      expect(viewInvoiceLinks.length).toBeGreaterThan(0);
      expect(viewInvoiceLinks[0].getAttribute("href")).toBe("/billing/inv_active_123");
    });
  });
});

