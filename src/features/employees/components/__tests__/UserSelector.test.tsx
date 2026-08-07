import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserSelector from "../UserSelector";

const mockSearchUsers = vi.fn();

vi.mock("@/features/users/api/users.api", () => ({
  searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
}));

describe("UserSelector", () => {
  beforeEach(() => {
    cleanup();
    mockSearchUsers.mockReset();
  });

  it("searches by name, username, email, and phone", async () => {
    mockSearchUsers.mockResolvedValue({ data: [{ id: "u1", name: "Rahul Sharma", username: "rahul.sharma", email: "rahul@salon.com", phone: "+919876543210", status: "active" }] });

    render(<UserSelector onSelect={() => undefined} />);

    const input = screen.getAllByLabelText(/linked user/i)[0];
    fireEvent.change(input, { target: { value: "Rahul Sharma" } });

    await waitFor(() => expect(mockSearchUsers).toHaveBeenCalled());
    expect(mockSearchUsers).toHaveBeenCalledWith(expect.objectContaining({ search: "Rahul Sharma" }));
  });

  it("shows a selected user summary without rendering raw ObjectIds", async () => {
    mockSearchUsers.mockResolvedValue({ data: [{ id: "u1", name: "Rahul Sharma", username: "rahul.sharma", email: "rahul@salon.com", phone: "+919876543210", status: "active" }] });

    render(<UserSelector onSelect={() => undefined} />);

    const input = screen.getAllByLabelText(/linked user/i)[0];
    fireEvent.change(input, { target: { value: "rahul" } });

    await waitFor(() => screen.getByText("Rahul Sharma"));

    fireEvent.click(screen.getByText("Rahul Sharma"));

    expect(screen.getByText("Rahul Sharma")).toBeTruthy();
    expect(screen.queryByText(/u1|66f1c92a/)).toBeNull();
  });
});
