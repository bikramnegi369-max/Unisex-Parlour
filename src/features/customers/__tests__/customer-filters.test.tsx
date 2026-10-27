// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerFilters } from "../components/CustomerFilters";

describe("CustomerFilters Component UI/UX", () => {
  it("renders status and sort dropdowns with active scope", () => {
    render(
      <CustomerFilters
        status="all"
        onStatusChange={vi.fn()}
        sort=""
        onSortChange={vi.fn()}
        onClearFilters={vi.fn()}
        activeScopeName="Downtown Branch"
        isRefetching={false}
      />
    );

    expect(screen.getByLabelText(/filter customers by status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort customers/i)).toBeInTheDocument();
    expect(screen.getByText("Downtown Branch")).toBeInTheDocument();
    // No active filter chips or reset button when pristine
    expect(screen.queryByText(/active filters/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
  });

  it("displays active filter badges and reset button when filters are applied", () => {
    const handleClearFilters = vi.fn();
    const handleStatusChange = vi.fn();
    const handleSortChange = vi.fn();

    render(
      <CustomerFilters
        status="active"
        onStatusChange={handleStatusChange}
        sort="-createdAt"
        onSortChange={handleSortChange}
        searchQuery="Alice"
        onClearSearch={vi.fn()}
        onClearFilters={handleClearFilters}
        activeScopeName="Downtown Branch"
        isRefetching={false}
        totalResults={42}
      />
    );

    // Filter count badge
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/active filters:/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: Active Only/i)).toBeInTheDocument();
    expect(screen.getByText(/Sort: Registration \(Newest\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Query: "Alice"/i)).toBeInTheDocument();
    expect(screen.getByText(/42 customer profiles found/i)).toBeInTheDocument();

    // Clicking Reset calls onClearFilters
    const resetButton = screen.getByRole("button", { name: /reset all active filters/i });
    fireEvent.click(resetButton);
    expect(handleClearFilters).toHaveBeenCalledTimes(1);

    // Clicking remove status chip calls onStatusChange("all")
    const removeStatusBtn = screen.getByLabelText(/remove status filter/i);
    fireEvent.click(removeStatusBtn);
    expect(handleStatusChange).toHaveBeenCalledWith("all");

    // Clicking remove sort chip calls onSortChange("")
    const removeSortBtn = screen.getByLabelText(/reset sorting to default/i);
    fireEvent.click(removeSortBtn);
    expect(handleSortChange).toHaveBeenCalledWith("");
  });
});
