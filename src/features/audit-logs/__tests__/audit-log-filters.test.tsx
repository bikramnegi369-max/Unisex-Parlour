// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AuditLogFilters } from "../components/AuditLogFilters";

// Mock useAuth
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { hasOrgWideAccess: true },
  }),
}));

// Mock useBranchContext
vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: () => ({
    availableBranches: [
      { id: "br_1", name: "Indiranagar Branch" },
      { id: "br_2", name: "Koramangala Branch" },
    ],
  }),
}));

afterEach(() => {
  cleanup();
});

describe("AuditLogFilters UI/UX Component", () => {
  const defaultProps = {
    entityType: "all",
    onEntityTypeChange: vi.fn(),
    action: "",
    onActionChange: vi.fn(),
    actorId: "",
    onActorIdChange: vi.fn(),
    branchId: "all",
    onBranchIdChange: vi.fn(),
    startDate: "",
    onStartDateChange: vi.fn(),
    endDate: "",
    onEndDateChange: vi.fn(),
    onClear: vi.fn(),
    totalResults: 154,
  };

  it("renders pristine state cleanly with zero active filter count and correct default values", () => {
    render(<AuditLogFilters {...defaultProps} />);

    // Action input present
    const actionInput = screen.getByLabelText("Filter by action code");
    expect(actionInput).toHaveValue("");

    // Actor ID input present
    const actorInput = screen.getByLabelText("Filter by actor ID");
    expect(actorInput).toHaveValue("");

    // Entity select default
    const entitySelect = screen.getByLabelText("Filter by Entity Type");
    expect(entitySelect).toHaveValue("all");

    // Branch select default
    const branchSelect = screen.getByLabelText("Filter by Branch Scope");
    expect(branchSelect).toHaveValue("all");

    // Reset button should NOT be rendered when no filters are active
    expect(
      screen.queryByRole("button", { name: /reset/i }),
    ).not.toBeInTheDocument();

    // Summary counts
    expect(screen.getByText("154")).toBeInTheDocument();
    expect(screen.getByText(/audit events/i)).toBeInTheDocument();
  });

  it("shows active filter badge count and reset button when multiple filters are active", () => {
    render(
      <AuditLogFilters
        {...defaultProps}
        action="CUSTOMER_CREATED"
        entityType="Customer"
        startDate="2026-09-01"
      />,
    );

    // Active badges in sub-bar
    expect(screen.getByText("Entity: Customer")).toBeInTheDocument();
    expect(screen.getByText("Action: CUSTOMER_CREATED")).toBeInTheDocument();
    expect(screen.getByText("3 active filters")).toBeInTheDocument();

    // Reset button with badge count 3
    const resetButton = screen.getByRole("button", { name: /reset/i });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveTextContent("3");
  });

  it("triggers onActionChange when user types and allows instant clear via clear icon", () => {
    const onActionChange = vi.fn();
    render(
      <AuditLogFilters
        {...defaultProps}
        action="SERVICE"
        onActionChange={onActionChange}
      />,
    );

    const actionInput = screen.getByLabelText("Filter by action code");
    fireEvent.change(actionInput, { target: { value: "SERVICE_UPDATED" } });
    expect(onActionChange).toHaveBeenCalledWith("SERVICE_UPDATED");

    // Click clear '✕' button
    const clearBtn = screen.getByLabelText("Clear action filter");
    fireEvent.click(clearBtn);
    expect(onActionChange).toHaveBeenCalledWith("");
  });

  it("triggers onEntityTypeChange and onBranchIdChange handlers properly", () => {
    const onEntityTypeChange = vi.fn();
    const onBranchIdChange = vi.fn();

    render(
      <AuditLogFilters
        {...defaultProps}
        onEntityTypeChange={onEntityTypeChange}
        onBranchIdChange={onBranchIdChange}
      />,
    );

    const entitySelect = screen.getByLabelText("Filter by Entity Type");
    fireEvent.change(entitySelect, { target: { value: "Appointment" } });
    expect(onEntityTypeChange).toHaveBeenCalledWith("Appointment");

    const branchSelect = screen.getByLabelText("Filter by Branch Scope");
    fireEvent.change(branchSelect, { target: { value: "br_2" } });
    expect(onBranchIdChange).toHaveBeenCalledWith("br_2");
  });

  it("triggers onClear callback when clicking the Reset button", () => {
    const onClear = vi.fn();
    render(
      <AuditLogFilters
        {...defaultProps}
        action="STAFF_DELETED"
        onClear={onClear}
      />,
    );

    const resetButton = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetButton);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
