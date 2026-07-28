// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock permissions index module
import { hasPermission, UserSession } from "@/lib/permissions";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { customerSchema } from "../schemas/customer.schema";

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
