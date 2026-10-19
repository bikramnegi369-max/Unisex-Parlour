import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/lib/api/axios";
import { getAppointment } from "../api/appointments.api";
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  assignStaffSchema,
  updateStatusSchema,
  serviceModificationPreviewSchema,
  serviceModificationCommitSchema,
} from "../schemas/appointment.schema";
import { formatInBranchTimezone } from "@/lib/formatters";

vi.mock("@/lib/api/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Appointment Schema & API Contract Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAppointment branch scoping", () => {
    it("passes specific branchScope when branchId is provided", async () => {
      const mockRaw = {
        _id: "apt_123",
        branchId: "branch_abc",
        customerId: "cust_1",
        date: "2026-10-12",
        startTime: "10:00",
        services: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockRaw },
      });

      const res = await getAppointment("apt_123", "branch_abc");

      expect(apiClient.get).toHaveBeenCalledWith("/appointments/apt_123", {
        branchScope: { type: "branch", branchId: "branch_abc" },
      });
      expect(res.id).toBe("apt_123");
    });

    it("falls back to current branchScope when branchId is omitted", async () => {
      const mockRaw = {
        _id: "apt_123",
        branchId: "branch_current",
        customerId: "cust_1",
        date: "2026-10-12",
        startTime: "10:00",
        services: [],
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockRaw },
      });

      await getAppointment("apt_123");

      expect(apiClient.get).toHaveBeenCalledWith("/appointments/apt_123", {
        branchScope: "current",
      });
    });
  });

  it("validates advance and walk-in appointment creation schemas with services and custom pricing", () => {
    const advanceWithCustomPricing = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_1",
      services: [
        { serviceId: "srv_1", customPrice: 400 },
        { serviceId: "srv_2" },
      ],
      date: "2026-08-20",
      startTime: "14:30",
      bookingType: "advance",
      notes: "Customer prefers window seat",
      reminder: { enabled: true, channel: "both", offsetMinutes: 60 },
    });
    expect(advanceWithCustomPricing.success).toBe(true);

    const advanceBackwardCompat = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_1",
      serviceIds: ["srv_1", "srv_2"],
      date: "2026-08-20",
      startTime: "14:30",
      bookingType: "advance",
      notes: "Customer prefers window seat",
      reminder: { enabled: true, channel: "both", offsetMinutes: 60 },
    });
    expect(advanceBackwardCompat.success).toBe(true);

    const walkInValid = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_2",
      services: [{ serviceId: "srv_1", customPrice: 500 }],
      date: "2026-08-13",
      startTime: "11:00",
      bookingType: "walk_in",
    });
    expect(walkInValid.success).toBe(true);

    const missingServices = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_2",
      services: [],
      date: "2026-08-13",
      startTime: "11:00",
      bookingType: "walk_in",
    });
    expect(missingServices.success).toBe(false);
  });

  it("rejects invalid time formats", () => {
    const invalidTime = createAppointmentSchema.safeParse({
      branchId: "br_1",
      customerId: "cust_1",
      serviceIds: ["srv_1"],
      date: "2026-08-20",
      startTime: "25:99", // Invalid HH:mm
      bookingType: "advance",
    });
    expect(invalidTime.success).toBe(false);
  });

  it("validates exact backend status enum values (and rejects un-contracted 'confirmed')", () => {
    const validStatuses = ["scheduled", "in_progress", "completed", "cancelled", "no_show"];
    validStatuses.forEach((status) => {
      const res = updateStatusSchema.safeParse({
        branchId: "br_1",
        status,
      });
      expect(res.success).toBe(true);
    });

    const invalidConfirmed = updateStatusSchema.safeParse({
      branchId: "br_1",
      status: "confirmed", // NOT in backend contract!
    });
    expect(invalidConfirmed.success).toBe(false);
  });

  it("validates same-branch rescheduling payload schema", () => {
    const validReschedule = rescheduleAppointmentSchema.safeParse({
      branchId: "br_1",
      date: "2026-08-25",
      startTime: "16:00",
      reason: "Customer requested time change",
    });
    expect(validReschedule.success).toBe(true);
  });

  it("validates staff assignment schema including unassignment (null)", () => {
    const assignStaff = assignStaffSchema.safeParse({
      branchId: "br_1",
      staffId: "emp_100",
    });
    expect(assignStaff.success).toBe(true);

    const unassignStaff = assignStaffSchema.safeParse({
      branchId: "br_1",
      staffId: null,
    });
    expect(unassignStaff.success).toBe(true);
  });

  it("validates updateStatusSchema with forceEarlyStart optional boolean and reason field", () => {
    const normal = updateStatusSchema.safeParse({
      branchId: "br_1",
      status: "in_progress",
    });
    expect(normal.success).toBe(true);
    expect(normal.data?.forceEarlyStart).toBeUndefined();

    const authorizedForce = updateStatusSchema.safeParse({
      branchId: "br_1",
      status: "in_progress",
      forceEarlyStart: true,
      reason: "Early VIP start authorized",
    });
    expect(authorizedForce.success).toBe(true);
    expect(authorizedForce.data?.forceEarlyStart).toBe(true);
    expect(authorizedForce.data?.reason).toBe("Early VIP start authorized");
  });

  it("validates serviceModificationPreviewSchema and serviceModificationCommitSchema", () => {
    const validPreview = serviceModificationPreviewSchema.safeParse({
      branchId: "br_1",
      services: [
        { serviceId: "srv_1", customPrice: 450, appliedSubscriptionId: "sub_1" },
        { serviceId: "srv_2" },
      ],
      discount: 50,
    });
    expect(validPreview.success).toBe(true);
    expect(validPreview.data?.services[0].appliedSubscriptionId).toBe("sub_1");

    const emptyPreviewServices = serviceModificationPreviewSchema.safeParse({
      branchId: "br_1",
      services: [],
    });
    expect(emptyPreviewServices.success).toBe(false);

    const validCommit = serviceModificationCommitSchema.safeParse({
      branchId: "br_1",
      previewToken: "tok_preview_123",
      services: [{ serviceId: "srv_1", customPrice: 450, appliedSubscriptionId: "sub_1" }],
      discount: 50,
      managerOverrideReason: "Authorized client request",
    });
    expect(validCommit.success).toBe(true);
    expect(validCommit.data?.discount).toBe(50);
    expect(validCommit.data?.services[0].appliedSubscriptionId).toBe("sub_1");

    const missingTokenCommit = serviceModificationCommitSchema.safeParse({
      branchId: "br_1",
      previewToken: "",
      services: [{ serviceId: "srv_1" }],
    });
    expect(missingTokenCommit.success).toBe(false);
  });

  describe("commitAppointmentServices response normalization", () => {
    it("normalizes data.initiatingAppointment and extracts shiftedAppointments IDs", async () => {
      const { commitAppointmentServices } = await import("../api/appointments.api");
      const mockRawResponse = {
        success: true,
        message: "Services updated successfully",
        data: {
          initiatingAppointment: {
            _id: "apt_init_1",
            branchId: "br_1",
            customerId: "cust_1",
            date: "2026-10-19",
            startTime: "11:00",
            services: [{ serviceId: "srv_1", name: "Haircut", duration: 30, price: 300 }],
            status: "scheduled",
          },
          shiftedAppointments: [
            { id: "apt_shift_1", proposedStartTime: "11:45" },
            { _id: "apt_shift_2", proposedStartTime: "12:30" },
          ],
        },
        affectedAppointmentIds: ["apt_shift_1"],
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockRawResponse,
      });

      const result = await commitAppointmentServices("apt_init_1", {
        branchId: "br_1",
        previewToken: "tok_123",
        services: [{ serviceId: "srv_1" }],
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("apt_init_1");
      expect(result.affectedAppointmentIds).toEqual(["apt_shift_1", "apt_shift_2"]);
      expect(result.shiftedAppointments).toHaveLength(2);
    });
  });

  describe("updateAppointmentStatus payload mapping", () => {
    it("sends reason and omits forceEarlyStart when false or unauthorized", async () => {
      const { updateAppointmentStatus } = await import("../api/appointments.api");
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            _id: "apt_1",
            branchId: "br_1",
            customerId: "cust_1",
            date: "2026-10-19",
            startTime: "11:00",
            status: "in_progress",
          },
        },
      });

      await updateAppointmentStatus("apt_1", {
        branchId: "br_1",
        status: "in_progress",
        forceEarlyStart: false,
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/appointments/apt_1/status",
        {
          branchId: "br_1",
          status: "in_progress",
        },
        expect.anything()
      );
    });

    it("sends reason mapped from cancellationReason and includes forceEarlyStart: true when explicitly set", async () => {
      const { updateAppointmentStatus } = await import("../api/appointments.api");
      vi.mocked(apiClient.patch).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            _id: "apt_1",
            branchId: "br_1",
            customerId: "cust_1",
            date: "2026-10-19",
            startTime: "11:00",
            status: "cancelled",
          },
        },
      });

      await updateAppointmentStatus("apt_1", {
        branchId: "br_1",
        status: "cancelled",
        cancellationReason: "Customer requested cancellation",
        forceEarlyStart: true,
      });

      expect(apiClient.patch).toHaveBeenCalledWith(
        "/appointments/apt_1/status",
        {
          branchId: "br_1",
          status: "cancelled",
          cancellationReason: "Customer requested cancellation",
          reason: "Customer requested cancellation",
          forceEarlyStart: true,
        },
        expect.anything()
      );
    });
  });

  it("formats appointment ISO datetimes accurately in branch timezones (Asia/Kolkata, UTC, America/New_York)", () => {
    const isoInstant = "2026-08-15T10:00:00.000Z";

    const kolkataTime = formatInBranchTimezone(isoInstant, "Asia/Kolkata");
    expect(kolkataTime).toContain("3:30"); // 10:00 UTC = 15:30 IST

    const utcTime = formatInBranchTimezone(isoInstant, "UTC");
    expect(utcTime).toContain("10:00");

    const nyTime = formatInBranchTimezone(isoInstant, "America/New_York");
    expect(nyTime).toContain("6:00"); // 10:00 UTC = 06:00 EDT (EDT is UTC-4 in August)
  });
});

