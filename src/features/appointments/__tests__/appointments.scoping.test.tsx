// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { hasPermission, UserSession } from "@/lib/permissions";
import { getScopeQueryKey } from "@/lib/api/queryKeys";
import { createAppointmentSchema } from "../schemas/appointment.schema";

describe("Appointments Branch Scoping & RBAC Verification", () => {
  it("verifies permissions are checked independently", () => {
    const user: UserSession = {
      id: "usr_1",
      name: "Receptionist",
      email: "staff@parlour.com",
      role: "Staff",
      permissions: ["appointments.view", "appointments.create"],
      organizationId: "org_1",
      branchAccess: [{ branchId: "br_1", branchName: "Main", isActive: true }],
    };

    expect(hasPermission(user, "appointments.view")).toBe(true);
    expect(hasPermission(user, "appointments.create")).toBe(true);
    expect(hasPermission(user, "appointments.edit")).toBe(false);
    expect(hasPermission(user, "appointments.update_status")).toBe(false);
    expect(hasPermission(user, "appointments.cancel")).toBe(false);
    expect(hasPermission(user, "appointments.delete")).toBe(false);
  });

  it("verifies Owner role receives no automatic permission bypass", () => {
    const ownerWithoutPermission: UserSession = {
      id: "usr_owner_1",
      name: "Owner",
      email: "owner@parlour.com",
      role: "Owner",
      permissions: ["appointments.view"],
      organizationId: "org_1",
      branchAccess: [],
    };

    expect(hasPermission(ownerWithoutPermission, "appointments.view")).toBe(true);
    expect(hasPermission(ownerWithoutPermission, "appointments.create")).toBe(false);
    expect(hasPermission(ownerWithoutPermission, "appointments.delete")).toBe(false);
  });

  it("generates correct branch-scoped and org-wide query keys with multi-field filters", () => {
    const filters = {
      search: "John",
      status: "scheduled",
      bookingType: "advance",
      staffId: "emp_10",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    };

    const branchKey = getScopeQueryKey("appointments", "br_100", [filters]);
    expect(branchKey).toEqual(["appointments", { scope: "branch", branchId: "br_100" }, filters]);

    const orgKey = getScopeQueryKey("appointments", null, [filters]);
    expect(orgKey).toEqual(["appointments", { scope: "organization" }, filters]);

    const allBranchesKey = getScopeQueryKey("appointments", "all", [filters]);
    expect(allBranchesKey).toEqual(["appointments", { scope: "organization" }, filters]);
  });

  it("fails mutation payload validation if branchId is missing or empty", () => {
    const invalidPayload = {
      branchId: "",
      customerId: "cust_123",
      serviceIds: ["srv_1"],
      date: "2026-08-15",
      startTime: "10:30",
      bookingType: "advance",
    };

    const result = createAppointmentSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const branchError = result.error.format().branchId;
      expect(branchError?._errors.length).toBeGreaterThan(0);
    }
  });

  it("succeeds mutation payload validation when explicit branchId is provided", () => {
    const validPayload = {
      branchId: "br_target_999",
      customerId: "cust_123",
      serviceIds: ["srv_1"],
      date: "2026-08-15",
      startTime: "10:30",
      bookingType: "advance",
    };

    const result = createAppointmentSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });
});
