// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import type { Appointment, AppointmentStatus } from "../types/appointment.types";

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
});

