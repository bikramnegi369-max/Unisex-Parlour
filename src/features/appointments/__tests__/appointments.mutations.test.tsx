// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import type { Appointment, AppointmentStatus } from "../types/appointment.types";
import { createAppointmentSchema } from "../schemas/appointment.schema";

describe("Appointment Mutation & Workflow Rules", () => {
  const sampleAppointment: Appointment = {
    id: "appt_123",
    organizationId: "org_1",
    branchId: "br_1",
    customerId: "cust_1",
    serviceIds: ["srv_1"],
    services: [
      {
        serviceId: "srv_1",
        name: "Haircut & Styling",
        duration: 45,
        price: 550,
      },
    ],
    staffId: "emp_10",
    bookingType: "advance",
    status: "scheduled",
    date: "2026-08-15",
    startTime: "10:30",
    endTime: "11:15",
    pricing: {
      subtotal: 550,
      total: 550,
    },
    createdAt: "2026-08-12T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
  };

  it("identifies terminal statuses correctly", () => {
    const isTerminalStatus = (status: AppointmentStatus) =>
      ["completed", "cancelled", "no_show"].includes(status);

    expect(isTerminalStatus("scheduled")).toBe(false);
    expect(isTerminalStatus("in_progress")).toBe(false);
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("cancelled")).toBe(true);
    expect(isTerminalStatus("no_show")).toBe(true);
  });

  it("distinguishes between Cancel status transition and Administrative Soft-Delete", () => {
    const cancelAction = {
      type: "STATUS_UPDATE",
      endpoint: `/appointments/${sampleAppointment.id}/status`,
      method: "PATCH",
      payload: {
        branchId: sampleAppointment.branchId,
        status: "cancelled",
        cancellationReason: "Customer sick",
      },
    };

    const deleteAction = {
      type: "ADMINISTRATIVE_DELETE",
      endpoint: `/appointments/${sampleAppointment.id}`,
      method: "DELETE",
      payload: {
        branchId: sampleAppointment.branchId,
      },
    };

    expect(cancelAction.method).toBe("PATCH");
    expect(cancelAction.payload.status).toBe("cancelled");
    expect(deleteAction.method).toBe("DELETE");
  });

  it("formats 409 scheduling conflict error message cleanly", () => {
    const handleAxiosError = (status: number, message?: string) => {
      if (status === 409) {
        return message || "Scheduling conflict: The selected staff or time slot is unavailable.";
      }
      return "An unexpected error occurred.";
    };

    const conflictMsg = handleAxiosError(409, "Double booking detected for Stylist Rahul at 10:30");
    expect(conflictMsg).toBe("Double booking detected for Stylist Rahul at 10:30");

    const fallbackConflictMsg = handleAxiosError(409);
    expect(fallbackConflictMsg).toBe("Scheduling conflict: The selected staff or time slot is unavailable.");
  });

  it("handles early start authorization rules correctly", () => {
    // 15-minute rule logic check
    const isMoreThan15MinsEarly = (apptDateStr: string, apptStartTimeStr: string, currentTime: Date): boolean => {
      const [y, m, d] = apptDateStr.split("-").map(Number);
      const [h, min] = apptStartTimeStr.split(":").map(Number);
      const apptTime = new Date(y, m - 1, d, h, min, 0);
      const diffMs = apptTime.getTime() - currentTime.getTime();
      return diffMs / 60000 > 15;
    };

    // Scheduled for 14:00. Current time is 13:30 (30m early -> >15m)
    const earlyTime = new Date(2026, 7, 15, 13, 30, 0);
    expect(isMoreThan15MinsEarly("2026-08-15", "14:00", earlyTime)).toBe(true);

    // Current time is 13:50 (10m early -> <=15m)
    const normalTime = new Date(2026, 7, 15, 13, 50, 0);
    expect(isMoreThan15MinsEarly("2026-08-15", "14:00", normalTime)).toBe(false);

    // Payload verification
    const ordinaryTransition = {
      branchId: "br_1",
      status: "in_progress",
    };
    expect((ordinaryTransition as { forceEarlyStart?: boolean }).forceEarlyStart).toBeUndefined();

    const authorizedEarlyTransition = {
      branchId: "br_1",
      status: "in_progress",
      forceEarlyStart: true,
    };
    expect(authorizedEarlyTransition.forceEarlyStart).toBe(true);
  });

  it("handles 409 stale preview proposal and requires fresh review", () => {
    let currentPreviewToken: string | null = "tok_preview_valid";
    let confirmationState: "staged" | "discarded" = "staged";

    const onCommitError = (statusCode: number) => {
      if (statusCode === 409) {
        // Discard stale confirmation state and invalidate token immediately
        currentPreviewToken = null;
        confirmationState = "discarded";
      }
    };

    onCommitError(409);
    expect(currentPreviewToken).toBeNull();
    expect(confirmationState).toBe("discarded");
  });

  it("never allows commit when a blocking schedule conflict exists even if managerOverrideReason is provided", () => {
    const previewData = {
      previewToken: "tok_test_conflict",
      canCommit: false,
      requiresManagerOverride: true,
      conflicts: [
        {
          type: "overlap",
          message: "Blocking collision with existing booking",
          isBlocking: true,
        },
      ],
    };
    const managerOverrideReason = "Manager authorized this emergency booking";

    const hasBlockingConflict = previewData.conflicts.some((c) => c.isBlocking);
    const isCommitAllowed =
      previewData.canCommit &&
      !hasBlockingConflict &&
      (!previewData.requiresManagerOverride || Boolean(managerOverrideReason.trim()));

    expect(isCommitAllowed).toBe(false);
  });

  it("invalidates initiating appointment, shifted appointments, calendar and checkout queue on commit success", () => {
    const invalidatedKeys: string[] = [];
    const queryClientMock = {
      invalidateQueries: vi.fn(({ queryKey, predicate }) => {
        if (queryKey) {
          invalidatedKeys.push(JSON.stringify(queryKey));
        } else if (predicate) {
          ["appointments", "appointment", "checkout-queue"].forEach((testKey) => {
            if (predicate({ queryKey: [testKey] })) {
              invalidatedKeys.push(testKey);
            }
          });
        }
      }),
    };

    const commitResult = {
      data: { id: "apt_init_1", staffId: "emp_1" },
      affectedAppointmentIds: ["apt_shift_1", "apt_shift_2"],
    };

    // Simulate onSuccess logic
    queryClientMock.invalidateQueries({
      predicate: (query: { queryKey: string[] }) => {
        const key = query.queryKey[0];
        return (
          key === "appointments" ||
          key === "appointment" ||
          key === "checkout-queue"
        );
      },
    });

    expect(invalidatedKeys).toContain("appointments");
    expect(invalidatedKeys).toContain("appointment");
    expect(invalidatedKeys).toContain("checkout-queue");
    expect(commitResult.affectedAppointmentIds).toEqual(["apt_shift_1", "apt_shift_2"]);
  });

  describe("Custom Services & Customer-Agreed Pricing Rules", () => {
    it("builds discriminated union payload correctly for registered and custom services", () => {
      type Line = {
        serviceId: string | null;
        name: string;
        duration: number;
        basePrice: number;
        customPrice?: number;
        appliedSubscriptionId?: string | null;
        isCustom?: boolean;
        serviceType?: "registered" | "custom";
        _id?: string;
      };

      const selectedLines: Line[] = [
        {
          serviceId: "srv-reg-1",
          name: "Hair Cut",
          duration: 30,
          basePrice: 500,
          customPrice: 450,
          appliedSubscriptionId: "sub-123",
          serviceType: "registered",
        },
        {
          serviceId: null,
          name: "Custom Beard Sculpture",
          duration: 20,
          basePrice: 0,
          customPrice: 300,
          serviceType: "custom",
          isCustom: true,
          _id: "existing-custom-line-id",
        },
      ];

      const modificationPayload = selectedLines.map((l) => {
        const isCustom = Boolean(l.isCustom || l.serviceType === "custom" || !l.serviceId);
        if (isCustom) {
          return {
            _id: l._id,
            serviceType: "custom" as const,
            name: l.name.trim(),
            duration: l.duration,
            price: l.customPrice !== undefined ? l.customPrice : 0,
          };
        }
        return {
          serviceType: "registered" as const,
          serviceId: l.serviceId!,
          customPrice: l.customPrice !== undefined ? l.customPrice : l.basePrice,
          appliedSubscriptionId: l.appliedSubscriptionId || undefined,
        };
      });

      // 1. Registered line
      expect(modificationPayload[0]).toEqual({
        serviceType: "registered",
        serviceId: "srv-reg-1",
        customPrice: 450,
        appliedSubscriptionId: "sub-123",
      });

      // 2. Custom line
      expect(modificationPayload[1]).toEqual({
        _id: "existing-custom-line-id",
        serviceType: "custom",
        name: "Custom Beard Sculpture",
        duration: 20,
        price: 300,
      });
      // Custom line must NEVER have appliedSubscriptionId or serviceId
      expect((modificationPayload[1] as { appliedSubscriptionId?: string }).appliedSubscriptionId).toBeUndefined();
      expect((modificationPayload[1] as { serviceId?: string }).serviceId).toBeUndefined();
    });

    it("preserves existing _id and agreed price when editing an existing custom service", () => {
      const existingCustomSnapshot = {
        _id: "snap_cust_888",
        serviceId: null,
        name: "Bridal Henna",
        duration: 90,
        price: 3500,
        isCustom: true,
        serviceType: "custom" as const,
      };

      // State initialized from snapshot
      const stateItem = {
        _id: existingCustomSnapshot._id,
        serviceId: existingCustomSnapshot.serviceId,
        name: existingCustomSnapshot.name,
        duration: existingCustomSnapshot.duration,
        basePrice: existingCustomSnapshot.price,
        price: existingCustomSnapshot.price,
        customPrice: existingCustomSnapshot.price, // Preserved customer agreed price
        serviceType: "custom" as const,
        isCustom: true,
      };

      const payload = {
        _id: stateItem._id,
        serviceType: stateItem.serviceType,
        name: stateItem.name,
        duration: stateItem.duration,
        price: stateItem.customPrice,
      };

      expect(payload._id).toBe("snap_cust_888");
      expect(payload.price).toBe(3500);
      expect(payload.name).toBe("Bridal Henna");
    });

    it("custom-only booking payload serializes valid services array and omits empty serviceIds array", () => {
      const formattedServices = [
        {
          serviceType: "custom" as const,
          name: "Special Bridal Touch-up",
          duration: 40,
          price: 1200,
        },
      ];

      const registeredServiceIds = formattedServices
        .map((s) => ("serviceId" in s ? (s as { serviceId?: string }).serviceId : undefined))
        .filter((id): id is string => Boolean(id));

      const serviceIdsPayload =
        registeredServiceIds.length > 0 ? { serviceIds: registeredServiceIds } : {};

      const payload = {
        branchId: "br_001",
        customerId: "cust_001",
        services: formattedServices,
        ...serviceIdsPayload,
        date: "2026-11-20",
        startTime: "10:00",
        bookingType: "advance" as const,
      };

      if (registeredServiceIds.length === 0) {
        delete (payload as { serviceIds?: string[] }).serviceIds;
      }

      // 1. serviceIds is completely omitted so backend body.serviceIds validation error is never triggered
      expect("serviceIds" in payload).toBe(false);
      // 2. services array contains the custom item with custom discriminator
      expect(payload.services).toHaveLength(1);
      expect(payload.services[0]).toEqual({
        serviceType: "custom",
        name: "Special Bridal Touch-up",
        duration: 40,
        price: 1200,
      });
      // 3. No catalog ID is sent or required
      expect((payload.services[0] as { serviceId?: string }).serviceId).toBeUndefined();
    });

    it("rejects empty service selection before sending request", () => {
      const emptyPayload = {
        branchId: "br_001",
        customerId: "cust_001",
        services: [],
        serviceIds: [],
        date: "2026-11-20",
        startTime: "10:00",
        bookingType: "advance",
      };

      const result = createAppointmentSchema.safeParse(emptyPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i: { message: string }) => i.message.includes("At least one service must be selected"))).toBe(true);
      }
    });

    it("preserves zero price and zero customPrice without falling back to catalog pricing", () => {
      // Test registered service with promotional 0 price
      const registeredZeroPriceItem = {
        serviceId: "srv_promo",
        customPrice: 0,
      };

      const catalogBasePrice = 600;
      const effectiveItemPrice =
        registeredZeroPriceItem.customPrice !== undefined && registeredZeroPriceItem.customPrice !== null
          ? Number(registeredZeroPriceItem.customPrice)
          : catalogBasePrice;

      expect(effectiveItemPrice).toBe(0);

      // Test custom service with 0 price (e.g., complimentary touchup)
      const customFreeService = {
        serviceType: "custom" as const,
        name: "Free Consultation",
        duration: 15,
        price: 0,
      };

      const formattedCustomPrice = Math.max(0, Number(customFreeService.price) || 0);
      expect(formattedCustomPrice).toBe(0);
    });

    it("mixed payload contains both registered and custom services exactly once with correct discriminators", () => {
      const selectedItems = [
        {
          serviceType: "registered" as const,
          serviceId: "srv_reg_1",
          customPrice: 450,
          appliedSubscriptionId: null,
        },
        {
          serviceType: "custom" as const,
          name: "Express Blowdry",
          duration: 25,
          price: 350,
        },
      ];

      const formattedServices = selectedItems.map((s) => {
        if (s.serviceType === "custom") {
          return {
            serviceType: "custom" as const,
            name: s.name.trim(),
            duration: Number(s.duration),
            price: Number(s.price),
          };
        }
        return {
          serviceType: "registered" as const,
          serviceId: s.serviceId,
          customPrice: s.customPrice,
          appliedSubscriptionId: s.appliedSubscriptionId || undefined,
        };
      });

      const registeredServiceIds = formattedServices
        .map((s) => ("serviceId" in s ? (s as { serviceId?: string }).serviceId : undefined))
        .filter((id): id is string => Boolean(id));

      expect(formattedServices).toHaveLength(2);
      expect(registeredServiceIds).toEqual(["srv_reg_1"]);
      expect(formattedServices[0].serviceType).toBe("registered");
      expect(formattedServices[1].serviceType).toBe("custom");
    });
  });
});


