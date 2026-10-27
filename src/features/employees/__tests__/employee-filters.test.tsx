import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EmployeeFilters } from "../components/EmployeeFilters";

describe("EmployeeFilters Component UI/UX", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders unified toolbar without layout shifts", () => {
    render(
      <EmployeeFilters
        search=""
        onSearchChange={vi.fn()}
        status="all"
        onStatusChange={vi.fn()}
        sort=""
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
        activeScopeName="East Wing Parlour"
        isRefetching={false}
        totalResults={12}
      />
    );

    expect(screen.getByPlaceholderText(/search staff by name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter employees by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort employees/i)).toBeInTheDocument();
    expect(screen.getByText("East Wing Parlour")).toBeInTheDocument();
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reset all active employee filters/i })).not.toBeInTheDocument();
  });

  it("handles status changes, clear actions, and search input cleanly", () => {
    const handleClearFilters = vi.fn();
    const handleStatusChange = vi.fn();
    const handleSortChange = vi.fn();
    const handleSearchChange = vi.fn();

    render(
      <EmployeeFilters
        search="Alice"
        onSearchChange={handleSearchChange}
        status="active"
        onStatusChange={handleStatusChange}
        sort="-joiningDate"
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
        activeScopeName="East Wing Parlour"
        isRefetching={false}
        totalResults={18}
      />
    );

    // Filter count badge shows active count (search + status + sort = 3)
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Status: active")).toBeInTheDocument();

    // Clicking Reset button
    const resetButton = screen.getByRole("button", { name: /reset all active employee filters/i });
    fireEvent.click(resetButton);
    expect(handleClearFilters).toHaveBeenCalledTimes(1);

    // Changing status via select
    const statusSelect = screen.getByLabelText(/filter employees by status/i);
    fireEvent.change(statusSelect, { target: { value: "inactive" } });
    expect(handleStatusChange).toHaveBeenCalledWith("inactive");

    // Changing sort via select
    const sortSelect = screen.getByLabelText(/sort employees/i);
    fireEvent.change(sortSelect, { target: { value: "name" } });
    expect(handleSortChange).toHaveBeenCalledWith("name");
  });
});
