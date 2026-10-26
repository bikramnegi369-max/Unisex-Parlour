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
    const firstPreviewService = validPreview.data?.services[0];
    if (firstPreviewService && "appliedSubscriptionId" in firstPreviewService) {
      expect(firstPreviewService.appliedSubscriptionId).toBe("sub_1");
    }

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
    const firstCommitService = validCommit.data?.services[0];
    if (firstCommitService && "appliedSubscriptionId" in firstCommitService) {
      expect(firstCommitService.appliedSubscriptionId).toBe("sub_1");
    }

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

  describe("Custom Services Schema & API Contract", () => {
    it("validates custom service in createAppointmentSchema", () => {
      const validCustom = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "Exclusive Grooming Package",
            duration: 60,
            price: 1500,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(validCustom.success).toBe(true);
    });

    it("rejects custom service with invalid name, duration, or negative price", () => {
      // Empty name
      const emptyName = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "   ",
            duration: 30,
            price: 500,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(emptyName.success).toBe(false);

      // Name over 120 chars
      const longName = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "A".repeat(121),
            duration: 30,
            price: 500,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(longName.success).toBe(false);

      // Duration < 1
      const zeroDuration = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "Valid Name",
            duration: 0,
            price: 500,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(zeroDuration.success).toBe(false);

      // Duration > 720
      const largeDuration = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "Valid Name",
            duration: 721,
            price: 500,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(largeDuration.success).toBe(false);

      // Negative price
      const negPrice = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "Valid Name",
            duration: 30,
            price: -50,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(negPrice.success).toBe(false);

      // Price = 0 is valid (free/complimentary custom service)
      const zeroPrice = createAppointmentSchema.safeParse({
        branchId: "br_1",
        customerId: "cust_1",
        services: [
          {
            serviceType: "custom",
            name: "Complimentary Head Massage",
            duration: 15,
            price: 0,
          },
        ],
        date: "2026-08-20",
        startTime: "14:30",
        bookingType: "advance",
      });
      expect(zeroPrice.success).toBe(true);
    });

    it("validates serviceModificationPreviewSchema and serviceModificationCommitSchema with custom services", () => {
      const validPreview = serviceModificationPreviewSchema.safeParse({
        branchId: "br_1",
        services: [
          {
            serviceType: "registered",
            serviceId: "srv_reg_1",
            customPrice: 400,
          },
          {
            serviceType: "custom",
            name: "Custom Beard Detailing",
            duration: 25,
            price: 250,
          },
        ],
      });
      expect(validPreview.success).toBe(true);

      const validCommit = serviceModificationCommitSchema.safeParse({
        branchId: "br_1",
        previewToken: "tok_secure_hash_12345",
        services: [
          {
            serviceType: "custom",
            name: "Special Styling",
            duration: 45,
            price: 700,
          },
        ],
        managerOverrideReason: "Authorized VIP customer request",
      });
      expect(validCommit.success).toBe(true);
    });

    it("calls preview and commit endpoints with exact paths and payloads", async () => {
      const { previewAppointmentServices, commitAppointmentServices } = await import(
        "../api/appointments.api"
      );

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            previewToken: "preview_tok_99",
            canCommit: true,
            requiresManagerOverride: false,
          },
        },
      });

      const previewPayload = {
        branchId: "br_1",
        services: [
          {
            serviceType: "custom" as const,
            name: "Custom Fade",
            duration: 35,
            price: 450,
          },
        ],
      };

      await previewAppointmentServices("apt_999", previewPayload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/appointments/apt_999/services/preview",
        previewPayload,
        expect.anything()
      );

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: "apt_999",
            services: [
              {
                name: "Custom Fade",
                duration: 35,
                price: 450,
                isCustom: true,
                serviceType: "custom",
                serviceId: null,
              },
            ],
          },
        },
      });

      const commitPayload = {
        branchId: "br_1",
        previewToken: "preview_tok_99",
        services: previewPayload.services,
      };

      await commitAppointmentServices("apt_999", commitPayload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/appointments/apt_999/services/commit",
        commitPayload,
        expect.anything()
      );
    });
  });

  describe("upsellAppointmentSubscription API Contract", () => {
    it("calls POST /appointments/:appointmentId/upsell-subscription and returns distinct subscription and invoice documents", async () => {
      const { upsellAppointmentSubscription } = await import(
        "../api/appointments.api"
      );

      const mockResponse = {
        success: true,
        status: "success",
        data: {
          subscription: {
            _id: "sub_upsell_1",
            subscriptionCode: "SUB-UP-001",
            price: 5000,
            status: "active",
            paymentStatus: "unpaid",
            invoiceId: "inv_upsell_sub_1",
          },
          invoiceId: "inv_upsell_sub_1",
          invoice: {
            _id: "inv_upsell_sub_1",
            invoiceNumber: "INV-SUB-009",
            status: "finalized",
            paymentStatus: "unpaid",
            amountDue: 5000,
          },
          summary: {
            servicesIncluded: 10,
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: mockResponse,
      });

      const payload = {
        branchId: "br_1",
        price: 5000,
        entitlements: [{ serviceId: "srv_haircut", quantity: 10 }],
        permittedBranchIds: ["br_1", "all"],
        startDate: "2026-10-24",
        endDate: "2027-04-24",
      };

      const result = await upsellAppointmentSubscription("apt_123", payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        "/appointments/apt_123/upsell-subscription",
        {
          ...payload,
          permittedBranchIds: ["br_1"],
        },
        { branchScope: { type: "branch", branchId: "br_1" } }
      );

      expect(result.subscription.id).toBe("sub_upsell_1");
      expect(result.invoiceId).toBe("inv_upsell_sub_1");
      expect(result.invoice?.invoiceNumber).toBe("INV-SUB-009");
      expect(result.invoice?.amountDue).toBe(5000);
    });
  });
});



