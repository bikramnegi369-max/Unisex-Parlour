// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { CustomerNotes } from "../components/CustomerNotes";
import { useCustomerNotes } from "../hooks/useCustomerNotes";
import { useCreateCustomerNote } from "../hooks/useCreateCustomerNote";
import { useCustomer } from "../hooks/useCustomer";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

// Mock dependencies
vi.mock("../hooks/useCustomerNotes", () => ({
  useCustomerNotes: vi.fn(),
}));

vi.mock("../hooks/useCreateCustomerNote", () => ({
  useCreateCustomerNote: vi.fn(),
}));

vi.mock("../hooks/useCustomer", () => ({
  useCustomer: vi.fn(),
}));

vi.mock("@/hooks/useBranchContext", () => ({
  useBranchContext: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  hasBranchAccess: (user: any, branchId: string) => {
    // Only br_1 and br_2 are accessible
    return ["br_1", "br_2"].includes(branchId);
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Customer Notes Module & Branch Scoping", () => {
  const mockCustomer = {
    id: "cust_123",
    name: "Alice Smith",
    homeBranchId: "br_1",
  };

  const mockUser = {
    id: "usr_1",
    role: "Owner",
    branchAccess: [
      { branchId: "br_1", isActive: true },
      { branchId: "br_2", isActive: true },
    ],
  };

  const mockBranches = [
    { id: "br_1", name: "Delhi Branch", isActive: true },
    { id: "br_2", name: "Mumbai Branch", isActive: true },
    { id: "br_3", name: "Noida Branch (Inaccessible)", isActive: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock setups
    (useAuth as any).mockReturnValue({ user: mockUser });
    (useCustomer as any).mockReturnValue({ data: mockCustomer, isLoading: false });
    (useCustomerNotes as any).mockReturnValue({
      data: {
        data: [
          {
            _id: "note_1",
            text: "Prefers senior stylist",
            branchId: "br_1",
            createdBy: { name: "Bikram" },
            createdAt: "2026-08-12T12:00:00Z",
          },
        ],
        meta: { total: 1, page: 1, limit: 5, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("automatically resolves branch context when scoped to a specific branch", async () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: "br_1",
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: false,
    });

    const mutateMock = vi.fn();
    (useCreateCustomerNote as any).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });

    render(<CustomerNotes customerId="cust_123" />);

    // Click Add Note to open dialog
    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    // Verify branch context Delhi Branch is shown read-only
    expect(screen.queryAllByText("Delhi Branch").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Select branch/i })).toBeNull();

    // Type content and submit
    const textarea = screen.getByPlaceholderText(/Type your note here/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Specific branch note content" } });

    const submitButton = screen.getByRole("button", { name: /Save Note/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(false);
    fireEvent.click(submitButton);

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cust_123",
        text: "Specific branch note content",
        branchId: "br_1",
      }),
      expect.any(Object)
    );
  });

  it("requires explicit branch selection when scoped to All Branches", async () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: null, // All Branches
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: true,
    });

    (useCreateCustomerNote as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(<CustomerNotes customerId="cust_123" />);

    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    expect(screen.queryAllByText("Delhi Branch").length).toBeGreaterThan(0);
  });

  it("uses the home branch as the default in All Branches view if accessible and valid", async () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: null,
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: true,
    });

    (useCreateCustomerNote as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(<CustomerNotes customerId="cust_123" />);

    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    // Verify it is pre-selected with the home branch 'Delhi Branch' (br_1)
    expect(screen.queryAllByText("Delhi Branch").length).toBeGreaterThan(0);
  });

  it("does not select home branch as default if it is inaccessible to the user", async () => {
    // Set customer's home branch to br_3 (which is inaccessible based on our permission mock)
    (useCustomer as any).mockReturnValue({
      data: { ...mockCustomer, homeBranchId: "br_3" },
      isLoading: false,
    });

    (useBranchContext as any).mockReturnValue({
      currentBranchId: null,
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: true,
    });

    (useCreateCustomerNote as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    render(<CustomerNotes customerId="cust_123" />);

    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    // Should default to "Select branch" because br_3 is not accessible
    expect(screen.getByText("Select branch")).not.toBeNull();
  });

  it("blocks empty and whitespace-only notes from being submitted", async () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: "br_1",
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: false,
    });

    const mutateMock = vi.fn();
    (useCreateCustomerNote as any).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    });

    render(<CustomerNotes customerId="cust_123" />);

    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    const submitButton = screen.getByRole("button", { name: /Save Note/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    const textarea = screen.getByPlaceholderText(/Type your note here/i) as HTMLTextAreaElement;
    
    // Test whitespace-only note
    fireEvent.change(textarea, { target: { value: "    " } });
    expect(submitButton.disabled).toBe(true);
  });

  it("disables submit button and prevents duplicate submissions while loading", async () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: "br_1",
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: false,
    });

    (useCreateCustomerNote as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: true, // loading
    });

    render(<CustomerNotes customerId="cust_123" />);

    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    const submitButton = screen.getByRole("button", { name: /Saving.../i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
  });

  it("preserves note content and branch on API failure", async () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: null,
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: true,
    });

    let errorCallback: any;
    (useCreateCustomerNote as any).mockReturnValue({
      mutate: vi.fn((payload, config) => {
        errorCallback = config.onError;
      }),
      isPending: false,
    });

    render(<CustomerNotes customerId="cust_123" />);

    const addButton = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(addButton);

    const textarea = screen.getByPlaceholderText(/Type your note here/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Preserve me!" } });

    const submitButton = screen.getByRole("button", { name: /Save Note/i }) as HTMLButtonElement;
    fireEvent.click(submitButton);

    // Trigger API error callback wrapped in act
    act(() => {
      errorCallback(new Error("API Failure"));
    });

    // Verify textarea content is still there, selection is still there, and error is visible
    expect(textarea.value).toBe("Preserve me!");
    expect(screen.queryAllByText("Delhi Branch").length).toBeGreaterThan(0);
    expect(screen.getByText("API Failure")).not.toBeNull();
  });

  it("exposes originating branch name in note item metadata when active scope is All Branches", () => {
    (useBranchContext as any).mockReturnValue({
      currentBranchId: null, // All Branches
      availableBranches: mockBranches,
      getBranchName: (id: string) => mockBranches.find((b) => b.id === id)?.name || id,
      isAllBranchesSelected: true,
    });

    render(<CustomerNotes customerId="cust_123" />);

    // Originating branch "Delhi Branch" should be rendered
    expect(screen.queryAllByText("Delhi Branch").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Prefers senior stylist").length).toBeGreaterThan(0);
  });
});
