import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AssignmentDialog } from "../components/AssignmentDialog";
import { SchemeBuilderDialog } from "../components/SchemeBuilderDialog";
import { SchemeDetailModal } from "../components/SchemeDetailModal";
import {
  formatCalculationBasisLabel,
  type IncentiveScheme,
} from "../types/incentives.types";

afterEach(cleanup);

const unsupportedScheme: IncentiveScheme = {
  id: "scheme-1",
  organizationId: "org-1",
  name: "Unverified Hybrid",
  code: "HYBRID",
  schemeType: "HYBRID",
  calculationBasis: "ATTENDANCE_DAYS",
  rules: {
    tiers: [],
    fixedAmountPaise: 100000,
    targetThresholdPaise: 0,
    minimumAttendanceDays: 24,
  },
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Incentive capability UI", () => {
  it("uses readable labels for supported sale and service calculation bases", () => {
    expect(formatCalculationBasisLabel("SERVICE_NET_REVENUE")).toBe(
      "Service net revenue",
    );
    expect(formatCalculationBasisLabel("SUBSCRIPTION_NET_REVENUE")).toBe(
      "Subscription sale net revenue",
    );
    expect(formatCalculationBasisLabel("MEMBERSHIP_NET_REVENUE")).toBe(
      "Membership sale net revenue",
    );
    expect(formatCalculationBasisLabel("PRODUCT_NET_REVENUE")).toBe(
      "Retail product sale net revenue",
    );
    expect(formatCalculationBasisLabel("LEGACY_CATEGORY")).toBe(
      "legacy category",
    );
  });

  it("offers service commission and biometric attendance bonus types", () => {
    render(
      <SchemeBuilderDialog isOpen onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];

    expect(Array.from(selects[0].options).map((option) => option.value)).toEqual([
      "COMMISSION",
      "ATTENDANCE_BONUS",
    ]);
    expect(Array.from(selects[1].options).map((option) => option.value)).toEqual([
      "SERVICE_NET_REVENUE",
      "SUBSCRIPTION_NET_REVENUE",
      "MEMBERSHIP_NET_REVENUE",
      "PRODUCT_NET_REVENUE",
    ]);
    expect(screen.getByText(/configure service, subscription-sale, membership-sale, or retail-sale commissions/i)).toBeTruthy();
  });

  it("configures and submits a fixed bonus with an attendance-day threshold", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SchemeBuilderDialog isOpen onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "ATTENDANCE_BONUS" },
    });
    expect(screen.queryByRole("button", { name: /add tier/i })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("e.g. Senior Stylist Commission 10%"), {
      target: { value: "Verified Attendance" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. STYLIST_COMM_10"), {
      target: { value: "ATTENDANCE_20" },
    });
    const amounts = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(amounts[0], { target: { value: "20" } });
    fireEvent.change(amounts[1], { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Verified Attendance",
        code: "ATTENDANCE_20",
        description: "",
        schemeType: "ATTENDANCE_BONUS",
        calculationBasis: "ATTENDANCE_DAYS",
        rules: {
          fixedAmountPaise: 100000,
          minimumAttendanceDays: 20,
          tiers: [],
        },
      });
    });
  });

  it("submits a blank tier maximum as unbounded and converts rupees to integer paise", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SchemeBuilderDialog isOpen onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Senior Stylist Commission 10%"), {
      target: { value: "Subscription sale" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. STYLIST_COMM_10"), {
      target: { value: "SCH_SUB_001" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[1], {
      target: { value: "SUBSCRIPTION_NET_REVENUE" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add tier/i }));

    const amounts = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(amounts[0], { target: { value: "250" } });
    fireEvent.change(amounts[1], { target: { value: "10000" } });
    fireEvent.change(amounts[3], { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Subscription sale",
        code: "SCH_SUB_001",
        description: "",
        schemeType: "COMMISSION",
        calculationBasis: "SUBSCRIPTION_NET_REVENUE",
        rules: {
          fixedAmountPaise: 25000,
          tiers: [
            {
              minPaise: 1000000,
              maxPaise: null,
              percentage: 5,
              fixedPaise: 0,
            },
          ],
        },
      });
    });
  });

  it("rejects a finite tier maximum below its minimum before submitting", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SchemeBuilderDialog isOpen onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Senior Stylist Commission 10%"), {
      target: { value: "Invalid tier" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. STYLIST_COMM_10"), {
      target: { value: "INVALID_TIER" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add tier/i }));

    const amounts = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(amounts[1], { target: { value: "500" } });
    fireEvent.change(amounts[2], { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText("Maximum must be greater than or equal to minimum.")).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not offer activation for an unsupported hybrid scheme", () => {
    render(
      <SchemeDetailModal
        scheme={unsupportedScheme}
        open
        onOpenChange={vi.fn()}
        onActivate={vi.fn()}
        canManage
      />,
    );

    expect(screen.queryByRole("button", { name: /activate/i })).toBeNull();
    expect(screen.getByText(/cannot be activated or assigned/i)).toBeTruthy();
  });

  it("labels subscription-sale commission bases clearly in scheme details", () => {
    const scheme: IncentiveScheme = {
      ...unsupportedScheme,
      schemeType: "COMMISSION",
      calculationBasis: "SUBSCRIPTION_NET_REVENUE",
      rules: {
        ...unsupportedScheme.rules,
        tiers: [{ minPaise: 0, maxPaise: null, percentage: 5, fixedPaise: 0 }],
      },
    };
    render(
      <SchemeDetailModal
        scheme={scheme}
        open
        onOpenChange={vi.fn()}
        onActivate={vi.fn()}
        canManage
      />,
    );

    expect(screen.getByText("Subscription sale commission")).toBeTruthy();
    expect(
      screen.getByText("Sold subscription net revenue after allocated discounts"),
    ).toBeTruthy();
    expect(screen.getByText("Eligible subscription sale line revenue")).toBeTruthy();
  });

  it("configures and labels retail product commission by net product revenue", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SchemeBuilderDialog isOpen onClose={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. Senior Stylist Commission 10%"), {
      target: { value: "Retail sale" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. STYLIST_COMM_10"), {
      target: { value: "RETAIL_SALE_5" },
    });
    fireEvent.change(screen.getAllByRole("combobox")[1], {
      target: { value: "PRODUCT_NET_REVENUE" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add tier/i }));
    const amounts = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    fireEvent.change(amounts[1], { target: { value: "1000" } });
    fireEvent.change(amounts[3], { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Retail sale",
        code: "RETAIL_SALE_5",
        description: "",
        schemeType: "COMMISSION",
        calculationBasis: "PRODUCT_NET_REVENUE",
        rules: {
          fixedAmountPaise: 0,
          tiers: [
            {
              minPaise: 100000,
              maxPaise: null,
              percentage: 5,
              fixedPaise: 0,
            },
          ],
        },
      });
    });

    const scheme: IncentiveScheme = {
      ...unsupportedScheme,
      schemeType: "COMMISSION",
      calculationBasis: "PRODUCT_NET_REVENUE",
      rules: {
        ...unsupportedScheme.rules,
        tiers: [{ minPaise: 0, maxPaise: null, percentage: 5, fixedPaise: 0 }],
      },
    };
    render(
      <SchemeDetailModal
        scheme={scheme}
        open
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Retail product sale commission")).toBeTruthy();
    expect(
      screen.getByText(
        "Sold retail product net revenue after allocated discounts and confirmed stock issue",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Eligible retail product sale line revenue")).toBeTruthy();
  });

  it("does not offer unsupported active schemes for assignment", () => {
    const staffList: Array<{ id: string; name: string; staffCode?: string }> = [];
    const branches: Array<{ id: string; name: string }> = [];
    render(
      <AssignmentDialog
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        schemes={[unsupportedScheme]}
        staffList={staffList}
        branches={branches}
      />,
    );

    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: /confirm assignment/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText(/no supported active incentive schemes/i)).toBeTruthy();
  });

  it("assigns a scheme to a selected branch with an explicit effective interval", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const activeCommissionScheme: IncentiveScheme = {
      ...unsupportedScheme,
      schemeType: "COMMISSION",
      calculationBasis: "SERVICE_NET_REVENUE",
      status: "active",
      rules: {
        tiers: [],
        fixedAmountPaise: 0,
        targetThresholdPaise: 0,
        minimumAttendanceDays: 0,
      },
    };
    render(
      <AssignmentDialog
        isOpen
        onClose={vi.fn()}
        onSubmit={onSubmit}
        schemes={[activeCommissionScheme]}
        staffList={[{ id: "staff-1", name: "Stylist One" }]}
        branches={[{ id: "branch-1", name: "Main Branch" }]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Who does this scheme apply to? *"), {
      target: { value: "BRANCH" },
    });
    fireEvent.change(screen.getByLabelText("Effective Start Date *"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.change(screen.getByLabelText("End Date (blank means ongoing)"), {
      target: { value: "2026-12-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        schemeId: "scheme-1",
        scopeType: "BRANCH",
        scopeId: "branch-1",
        startDate: "2026-11-01T00:00:00.000Z",
        endDate: "2026-12-01T00:00:00.000Z",
        priority: 0,
      });
    });
  });
});
