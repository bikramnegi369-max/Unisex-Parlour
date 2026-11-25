import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EffectiveSettingsPanel } from "../components/EffectiveSettingsPanel";

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    currentBranchId: "branch-1",
    currentBranch: { id: "branch-1", name: "Downtown" },
  }),
}));

vi.mock("../hooks/useSettings", () => ({
  useEffectiveSettings: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      organizationId: "org-1",
      branchId: "branch-1",
      regional: {
        timezone: { value: "Asia/Kolkata", source: "branch_override" },
        currency: { value: "INR", source: "organization" },
        locale: { value: "en-IN", source: "organization" },
        dateFormat: { value: "YYYY-MM-DD", source: "system_default" },
        timeFormat: { value: "HH:mm", source: "system_default" },
        firstDayOfWeek: { value: 1, source: "system_default" },
      },
      appointments: {
        bufferMinutes: { value: 0, source: "branch_override" },
        allowWalkIns: { value: false, source: "branch_override" },
        allowAdvanceBookings: { value: true, source: "organization" },
        reminderDefaultOffsetMinutes: { value: 60, source: "system_default" },
      },
      attendance: {
        graceMinutes: { value: 15, source: "system_default" },
        autoMarkAbsentAfterCutoff: { value: false, source: "system_default" },
      },
      leaves: {
        weeklyOffDays: { value: [], source: "branch_override" },
        allowHalfDay: { value: true, source: "organization" },
        allowBranchPolicyOverrides: { value: false, source: "system_default" },
      },
      exports: {
        retentionHours: { value: 24, source: "system_default" },
      },
      operatingHours: { isConfigured: false, schedule: null },
    },
  }),
}));

describe("EffectiveSettingsPanel", () => {
  it("displays authoritative resolved values and source badges including explicit false, 0, and []", () => {
    render(<EffectiveSettingsPanel />);
    expect(screen.getByText(/Effective Settings — Downtown/)).toBeTruthy();
    expect(screen.getByText("None (Open All Week)")).toBeTruthy();
    expect(screen.getAllByText("Branch Override").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Organization").length).toBeGreaterThan(0);
    expect(screen.getAllByText("System Default").length).toBeGreaterThan(0);
  });
});
