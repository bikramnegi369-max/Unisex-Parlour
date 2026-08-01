// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";


// Mock permissions index module
import { hasPermission, UserSession } from "@/lib/permissions";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { customerSchema } from "../schemas/customer.schema";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "usr_1",
      name: "Owner 1",
      email: "owner1@parlour.com",
      role: "Owner",
      permissions: ["customers.view", "customers.create", "customers.edit", "customers.delete"],
      organizationId: "org_1",
      branchAccess: [],
    },
  }),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    availableBranches: [
      { id: "br_1", name: "Main Branch", organizationId: "org_1", isActive: true }
    ],
  }),
}));

describe("Customer Module Permissions and RBAC", () => {
  it("verifies view permission is checked independently", () => {
    const user: UserSession = {
      id: "usr_1",
      name: "Staff",
      email: "staff@parlour.com",
      role: "Stylist",
      permissions: ["customers.view"],
      organizationId: "org_1",
      branchAccess: [],
    };

    expect(hasPermission(user, "customers.view")).toBe(true);
    expect(hasPermission(user, "customers.create")).toBe(false);
    expect(hasPermission(user, "customers.edit")).toBe(false);
    expect(hasPermission(user, "customers.delete")).toBe(false);
  });

  it("verifies Owner role receives no automatic permission bypass", () => {
    const ownerWithPermission: UserSession = {
      id: "usr_owner_1",
      name: "Owner 1",
      email: "owner1@parlour.com",
      role: "Owner",
      permissions: ["customers.view", "customers.create"],
      organizationId: "org_1",
      branchAccess: [],
    };

    const ownerWithoutPermission: UserSession = {
      id: "usr_owner_2",
      name: "Owner 2",
      email: "owner2@parlour.com",
      role: "Owner",
      permissions: [],
      organizationId: "org_1",
      branchAccess: [],
    };

    expect(hasPermission(ownerWithPermission, "customers.view")).toBe(true);
    expect(hasPermission(ownerWithPermission, "customers.create")).toBe(true);
    expect(hasPermission(ownerWithoutPermission, "customers.view")).toBe(false); // No bypass
    expect(hasPermission(ownerWithoutPermission, "customers.create")).toBe(false); // No bypass
  });
});

describe("Customer Scoping and Caching keys", () => {
  it("ensures Branch A and Branch B lists have distinct cache keys", () => {
    const keyA = getScopeQueryKey("customers", "br_A");
    const keyB = getScopeQueryKey("customers", "br_B");
    expect(keyA).toEqual(["customers", { scope: "branch", branchId: "br_A" }]);
    expect(keyB).toEqual(["customers", { scope: "branch", branchId: "br_B" }]);
    expect(keyA).not.toEqual(keyB);
  });

  it("ensures Organization consolidated and branch-specific lists have distinct cache keys", () => {
    const keyOrg = getScopeQueryKey("customers", null);
    const keyBranch = getScopeQueryKey("customers", "br_A");
    expect(keyOrg).toEqual(["customers", { scope: "organization" }]);
    expect(keyBranch).toEqual(["customers", { scope: "branch", branchId: "br_A" }]);
    expect(keyOrg).not.toEqual(keyBranch);
  });

  it("ensures details queries are scope-aware", () => {
    const keyDetailA = getScopeQueryKey("customer", "br_A", ["cust_123"]);
    const keyDetailB = getScopeQueryKey("customer", "br_B", ["cust_123"]);
    expect(keyDetailA).toEqual(["customer", { scope: "branch", branchId: "br_A" }, "cust_123"]);
    expect(keyDetailB).toEqual(["customer", { scope: "branch", branchId: "br_B" }, "cust_123"]);
    expect(keyDetailA).not.toEqual(keyDetailB);
  });
});

describe("Customer Zod Form Validation", () => {
  it("rejects empty name and phone number", () => {
    const result = customerSchema.safeParse({
      name: "",
      phone: "",
      email: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name).toContain("Name is required");
      expect(fieldErrors.phone).toContain("Phone number must be at least 6 digits");
    }
  });

  it("accepts valid E.164 phone formats", () => {
    const result = customerSchema.safeParse({
      name: "Jane Doe",
      phone: "+12345678901",
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone formats", () => {
    const result = customerSchema.safeParse({
      name: "Jane Doe",
      phone: "abc12345",
      email: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });
});

import { CustomerProfileHeader } from "../components/CustomerProfileHeader";
import CustomerReactivateDialog from "../components/CustomerReactivateDialog";

describe("Customer Reactivation UI Components", () => {
  afterEach(() => {
    cleanup();
  });

  const activeCustomer = {
    id: "cust_1",
    name: "John Doe",
    phone: "12345678",
    email: "john@example.com",
    status: "active" as const,
    loyaltyPoints: 0,
    organizationId: "org_1",
    homeBranchId: "br_1",
    visitedBranchIds: [],
    createdAt: "",
    updatedAt: "",
  };

  const inactiveCustomer = {
    ...activeCustomer,
    id: "cust_2",
    status: "inactive" as const,
  };

  it("renders Deactivate button but not Reactivate for an active customer when canDelete is true", () => {
    render(
      <CustomerProfileHeader
        customer={activeCustomer}
        homeBranchName="Main Branch"
        canEdit={true}
        canDelete={true}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />
    );

    expect(screen.queryByText("Deactivate")).not.toBeNull();
    expect(screen.queryByText("Reactivate")).toBeNull();
  });

  it("renders Reactivate button but not Deactivate for an inactive customer when canEdit is true and canDelete is false", () => {
    render(
      <CustomerProfileHeader
        customer={inactiveCustomer}
        homeBranchName="Main Branch"
        canEdit={true}
        canDelete={false}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />
    );

    expect(screen.queryByText("Reactivate")).not.toBeNull();
    expect(screen.queryByText("Deactivate")).toBeNull();
  });

  it("hides Reactivate button for an inactive customer when canEdit is false and canDelete is true", () => {
    render(
      <CustomerProfileHeader
        customer={inactiveCustomer}
        homeBranchName="Main Branch"
        canEdit={false}
        canDelete={true}
        onBack={vi.fn()}
        onEdit={vi.fn()}
        onDeactivate={vi.fn()}
        onReactivate={vi.fn()}
      />
    );

    expect(screen.queryByText("Reactivate")).toBeNull();
    expect(screen.queryByText("Deactivate")).toBeNull();
  });

  it("opens Reactivate dialog and triggers callback on confirm", () => {
    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();
    render(
      <CustomerReactivateDialog
        isOpen={true}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        isLoading={false}
        error={null}
        customerName="John Doe"
      />
    );

    expect(screen.queryByText("Reactivate Customer Profile")).not.toBeNull();
    expect(screen.queryByText(/Are you sure you want to reactivate/)).not.toBeNull();

    const confirmButton = screen.queryByRole("button", { name: "Reactivate" });
    if (confirmButton) {
      confirmButton.click();
      expect(onConfirmMock).toHaveBeenCalled();
    }
  });
});

import CustomerTable from "../components/CustomerTable";

describe("CustomerTable Actions Click", () => {
  afterEach(() => {
    cleanup();
  });

  const activeCustomer = {
    id: "cust_1",
    name: "John Doe",
    phone: "12345678",
    email: "john@example.com",
    status: "active" as const,
    loyaltyPoints: 0,
    organizationId: "org_1",
    homeBranchId: "br_1",
    visitedBranchIds: [],
    createdAt: "2026-07-29T12:00:00.000Z",
    updatedAt: "2026-07-29T12:00:00.000Z",
  };

  const inactiveCustomer = {
    ...activeCustomer,
    id: "cust_2",
    status: "inactive" as const,
  };

  it("triggers onView callback when View button is clicked", () => {
    const onViewMock = vi.fn();
    render(
      <CustomerTable
        customers={[activeCustomer]}
        onView={onViewMock}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
        isLoading={false}
        isAllBranches={false}
      />
    );

    const viewButtons = screen.queryAllByRole("button", { name: "View details of John Doe" });
    expect(viewButtons.length).toBeGreaterThan(0);
    viewButtons[0].click();
    expect(onViewMock).toHaveBeenCalledWith(activeCustomer);
  });

  it("triggers onEdit callback when Edit button is clicked", () => {
    const onEditMock = vi.fn();
    render(
      <CustomerTable
        customers={[activeCustomer]}
        onView={vi.fn()}
        onEdit={onEditMock}
        onDelete={vi.fn()}
        onReactivate={vi.fn()}
        isLoading={false}
        isAllBranches={false}
      />
    );

    const editButtons = screen.queryAllByRole("button", { name: "Edit profile of John Doe" });
    expect(editButtons.length).toBeGreaterThan(0);
    editButtons[0].click();
    expect(onEditMock).toHaveBeenCalledWith(activeCustomer);
  });

  it("triggers onDelete callback when Deactivate button is clicked", () => {
    const onDeleteMock = vi.fn();
    render(
      <CustomerTable
        customers={[activeCustomer]}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDeleteMock}
        onReactivate={vi.fn()}
        isLoading={false}
        isAllBranches={false}
      />
    );

    const deleteButtons = screen.queryAllByRole("button", { name: "Deactivate profile of John Doe" });
    expect(deleteButtons.length).toBeGreaterThan(0);
    deleteButtons[0].click();
    expect(onDeleteMock).toHaveBeenCalledWith(activeCustomer);
  });

  it("triggers onReactivate callback when Reactivate button is clicked", () => {
    const onReactivateMock = vi.fn();
    render(
      <CustomerTable
        customers={[inactiveCustomer]}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onReactivate={onReactivateMock}
        isLoading={false}
        isAllBranches={false}
      />
    );

    const reactivateButtons = screen.queryAllByRole("button", { name: "Reactivate profile of John Doe" });
    expect(reactivateButtons.length).toBeGreaterThan(0);
    reactivateButtons[0].click();
    expect(onReactivateMock).toHaveBeenCalledWith(inactiveCustomer);
  });
});


