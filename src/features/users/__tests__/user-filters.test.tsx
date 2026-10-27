// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { UserFilters } from "../components/UserFilters";

afterEach(() => {
  cleanup();
});

describe("UserFilters UI/UX Component", () => {
  const defaultProps = {
    search: "",
    onSearchChange: vi.fn(),
    status: "all",
    onStatusChange: vi.fn(),
    sort: "",
    onSortChange: vi.fn(),
    onClearFilters: vi.fn(),
    activeScopeName: "Organization-Wide",
    isRefetching: false,
    totalResults: 42,
  };

  it("renders pristine state cleanly with zero active filter count and correct default values", () => {
    render(<UserFilters {...defaultProps} />);

    // Search input present
    const searchInput = screen.getByLabelText("Search users");
    expect(searchInput).toHaveValue("");

    // Status select default
    const statusSelect = screen.getByLabelText("Filter Users by Status");
    expect(statusSelect).toHaveValue("all");

    // Sort select default
    const sortSelect = screen.getByLabelText("Sort Users");
    expect(sortSelect).toHaveValue("");

    // Reset button should NOT be rendered when no filters are active
    expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();

    // Summary counts
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText(/user accounts/i)).toBeInTheDocument();
    expect(screen.getByText("Organization-Wide")).toBeInTheDocument();
  });

  it("shows active filter badge count and reset button when search, status, and sort are active", () => {
    render(
      <UserFilters
        {...defaultProps}
        search="Alex"
        status="active"
        sort="-createdAt"
      />,
    );

    // Active status pill
    expect(screen.getByText("Status: active")).toBeInTheDocument();
    expect(screen.getByText("3 active filters")).toBeInTheDocument();

    // Reset button with badge count 3
    const resetButton = screen.getByRole("button", { name: /reset/i });
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toHaveTextContent("3");
  });

  it("triggers onSearchChange when user types and allows instant clear via clear icon", () => {
    const onSearchChange = vi.fn();
    render(<UserFilters {...defaultProps} search="John" onSearchChange={onSearchChange} />);

    const searchInput = screen.getByLabelText("Search users");
    fireEvent.change(searchInput, { target: { value: "Johnny" } });
    expect(onSearchChange).toHaveBeenCalledWith("Johnny");

    // Click clear '✕' button
    const clearBtn = screen.getByLabelText("Clear search query");
    fireEvent.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("triggers onStatusChange and onSortChange handlers properly", () => {
    const onStatusChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <UserFilters
        {...defaultProps}
        onStatusChange={onStatusChange}
        onSortChange={onSortChange}
      />,
    );

    const statusSelect = screen.getByLabelText("Filter Users by Status");
    fireEvent.change(statusSelect, { target: { value: "suspended" } });
    expect(onStatusChange).toHaveBeenCalledWith("suspended");

    const sortSelect = screen.getByLabelText("Sort Users");
    fireEvent.change(sortSelect, { target: { value: "name" } });
    expect(onSortChange).toHaveBeenCalledWith("name");
  });

  it("triggers onClearFilters callback when clicking the Reset button", () => {
    const onClearFilters = vi.fn();
    render(
      <UserFilters
        {...defaultProps}
        status="locked"
        onClearFilters={onClearFilters}
      />,
    );

    const resetButton = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetButton);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
