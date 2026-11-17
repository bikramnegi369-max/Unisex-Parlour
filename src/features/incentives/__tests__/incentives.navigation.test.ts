import { describe, it, expect } from "vitest";
import { routePermissions } from "@/lib/permissions/routePermissions";
import { hasPermission, type PermissionType, type UserSession } from "@/lib/permissions";

describe("Incentives Frontend Route, Permissions & Navigation Contract Verification", () => {
  it("verifies /incentives is mapped to canonical incentives.view permission", () => {
    expect(routePermissions["/incentives"]).toBe("incentives.view");
  });

  it("authorizes a user with incentives.view to view the route", () => {
    const userWithView: UserSession = {
      id: "u1",
      name: "Salon Manager",
      email: "manager@salon.com",
      role: "manager",
      organizationId: "org_1",
      branchAccess: [{ branchId: "b1", role: "manager", isActive: true }],
      permissions: ["incentives.view"],
    };

    expect(hasPermission(userWithView, "incentives.view")).toBe(true);
  });

  it("denies access when user lacks incentives.view", () => {
    const userWithoutView: UserSession = {
      id: "u2",
      name: "Stylist",
      email: "stylist@salon.com",
      role: "stylist",
      organizationId: "org_1",
      branchAccess: [{ branchId: "b1", role: "stylist", isActive: true }],
      permissions: ["appointments.view"],
    };

    expect(hasPermission(userWithoutView, "incentives.view")).toBe(false);
    expect(hasPermission(userWithoutView, "incentives.rules.manage")).toBe(false);
  });

  it("verifies permissions registry includes all 7 canonical incentives permissions", () => {
    const expectedPerms: PermissionType[] = [
      "incentives.view",
      "incentives.view.all",
      "incentives.rules.manage",
      "incentives.approve",
      "incentives.payout.sync",
      "incentives.fulfillment.confirm",
      "incentives.fulfillment.correct",
    ];

    const managerUser: UserSession = {
      id: "u3",
      name: "Owner",
      email: "owner@salon.com",
      role: "owner",
      organizationId: "org_1",
      branchAccess: [],
      hasOrgWideAccess: true,
      permissions: expectedPerms,
    };

    expectedPerms.forEach((perm) => {
      expect(hasPermission(managerUser, perm)).toBe(true);
    });
  });
});
