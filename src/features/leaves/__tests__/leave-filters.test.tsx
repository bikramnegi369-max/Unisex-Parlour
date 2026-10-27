// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import LeaveFilters from "../components/LeaveFilters";

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "mgr-1",
      name: "Manager Jane",
      permissions: ["employees.leaves.view", "employees.leaves.manage"],
    },
  }),
}));

vi.mock("@/features/employees/hooks/useEmployees", () => ({
  useEmployees: () => ({
    data: {
      data: [
        { id: "emp-101", name: "David Stylist" },
        { id: "emp-102", name: "Sarah Colourist" },
      ],
    },
    isLoading: false,
  }),
}));

describe("LeaveFilters Component UI/UX", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders unified toolbar cleanly without layout shifts in pristine state", () => {
    render(
      <LeaveFilters
        search=""
        onSearchChange={vi.fn()}
        status="all"
        onStatusChange={vi.fn()}
        staffId=""
        onStaffIdChange={vi.fn()}
        startDate=""
        onStartDateChange={vi.fn()}
        endDate=""
        onEndDateChange={vi.fn()}
        onClear={vi.fn()}
        activeScopeName="South Branch"
        isRefetching={false}
        totalResults={15}
      />
    );

    expect(screen.getByPlaceholderText(/search reason or code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter leaves by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter leaves by staff member/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByText("South Branch")).toBeInTheDocument();
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reset all active leave filters/i })).not.toBeInTheDocument();
  });

  it("displays active filter count, status badge, and invokes clear and update callbacks", () => {
    const handleClear = vi.fn();
    const handleStatusChange = vi.fn();
    const handleStaffChange = vi.fn();
    const handleStartDateChange = vi.fn();

    render(
      <LeaveFilters
        search="vacation"
        onSearchChange={vi.fn()}
        status="approved"
        onStatusChange={handleStatusChange}
        staffId="emp-101"
        onStaffIdChange={handleStaffChange}
        startDate="2026-11-01"
        onStartDateChange={handleStartDateChange}
        endDate="2026-11-05"
        onEndDateChange={vi.fn()}
        onClear={handleClear}
        activeScopeName="South Branch"
        isRefetching={false}
        totalResults={4}
      />
    );

    // Active count badge in Reset button
    expect(screen.getByRole("button", { name: /reset all active leave filters/i })).toHaveTextContent("4");
    expect(screen.getByText("Status: approved")).toBeInTheDocument();
    expect(screen.getByText(/2026-11-01 → 2026-11-05/i)).toBeInTheDocument();

    // Clicking Reset button
    const resetBtn = screen.getByRole("button", { name: /reset all active leave filters/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);

    // Changing status via select
    const statusSelect = screen.getByLabelText(/filter leaves by status/i);
    fireEvent.change(statusSelect, { target: { value: "pending" } });
    expect(handleStatusChange).toHaveBeenCalledWith("pending");
  });
});
