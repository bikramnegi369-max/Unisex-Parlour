import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Header from "../Header";
import { notificationsApi } from "@/features/notifications/api/notifications.api";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/store", () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: () => "light",
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Aarav", email: "aarav@glam.com" },
    logout: vi.fn(),
  }),
}));

vi.mock("../BranchSwitcher", () => ({
  default: () => <div data-testid="branch-switcher" />,
}));

function renderHeader() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <Header />
    </QueryClientProvider>,
  );
}

describe("Header Notification Bell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders dynamic unread count, marks one read and navigates, and marks all read", async () => {
    vi.spyOn(notificationsApi, "getInbox").mockResolvedValue({
      success: true,
      unreadCount: 1,
      pagination: { page: 1, limit: 8, total: 1 },
      data: [
        {
          _id: "n1",
          notificationId: "nid-1",
          eventType: "appointment.created",
          purpose: "transactional",
          channel: "in_app",
          branchId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
          isRead: false,
        },
      ],
    });
    const markOneSpy = vi
      .spyOn(notificationsApi, "markInboxItemRead")
      .mockResolvedValue({ success: true, data: { _id: "n1", readAt: new Date().toISOString(), isRead: true } });
    const markAllSpy = vi
      .spyOn(notificationsApi, "markAllInboxRead")
      .mockResolvedValue({ success: true, modifiedCount: 1 });

    renderHeader();

    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(await screen.findByText("1 New")).toBeTruthy();
    expect(screen.getByText("Appointment Confirmed")).toBeTruthy();

    fireEvent.click(screen.getByText("Mark all read"));
    await waitFor(() => expect(markAllSpy).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("Appointment Confirmed"));
    await waitFor(() => {
      expect(markOneSpy).toHaveBeenCalledWith("n1");
      expect(mockPush).toHaveBeenCalledWith("/appointments");
    });
  });

  it("renders empty state when inbox has no notifications", async () => {
    vi.spyOn(notificationsApi, "getInbox").mockResolvedValue({
      success: true,
      unreadCount: 0,
      pagination: { page: 1, limit: 8, total: 0 },
      data: [],
    });

    renderHeader();
    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(await screen.findByText(/all caught up/i)).toBeTruthy();
  });

  it("renders error state with retry when inbox fails", async () => {
    vi.spyOn(notificationsApi, "getInbox").mockRejectedValue(new Error("Network error"));

    renderHeader();
    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(await screen.findByText("Could not load notifications.")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("toggles sound mute and keeps visual notifications visible when muted", async () => {
    vi.spyOn(notificationsApi, "getInbox").mockResolvedValue({
      success: true,
      unreadCount: 1,
      pagination: { page: 1, limit: 8, total: 1 },
      data: [
        {
          _id: "n1",
          notificationId: "nid-1",
          eventType: "invoice.settled",
          purpose: "transactional",
          channel: "in_app",
          branchId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
          isRead: false,
        },
      ],
    });

    renderHeader();
    fireEvent.click(screen.getByLabelText("Notifications"));

    expect(await screen.findByText("Invoice Settled")).toBeTruthy();
    const muteBtn = screen.getByLabelText("Mute notification sound");
    fireEvent.click(muteBtn);

    expect(screen.getByLabelText("Unmute notification sound")).toBeTruthy();
    expect(screen.getByText("Invoice Settled")).toBeTruthy();
  });

  it("does not play sound on initial load and plays once when a new unread notification arrives", async () => {
    const soundMod = await import("@/features/notifications/utils/notificationSound");
    const chimeSpy = vi.spyOn(soundMod, "playNotificationChime").mockResolvedValue(true);

    const getInboxSpy = vi.spyOn(notificationsApi, "getInbox").mockResolvedValueOnce({
      success: true,
      unreadCount: 1,
      pagination: { page: 1, limit: 8, total: 1 },
      data: [
        {
          _id: "n-initial",
          notificationId: "nid-initial",
          eventType: "appointment.created",
          purpose: "transactional",
          channel: "in_app",
          branchId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
          isRead: false,
        },
      ],
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <Header />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(getInboxSpy).toHaveBeenCalledTimes(1));
    expect(chimeSpy).not.toHaveBeenCalled();

    // Simulate next poll returning a new unread notification
    getInboxSpy.mockResolvedValueOnce({
      success: true,
      unreadCount: 2,
      pagination: { page: 1, limit: 8, total: 2 },
      data: [
        {
          _id: "n-new-2",
          notificationId: "nid-new-2",
          eventType: "invoice.settled",
          purpose: "transactional",
          channel: "in_app",
          branchId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
          isRead: false,
        },
        {
          _id: "n-initial",
          notificationId: "nid-initial",
          eventType: "appointment.created",
          purpose: "transactional",
          channel: "in_app",
          branchId: null,
          createdAt: new Date().toISOString(),
          readAt: null,
          isRead: false,
        },
      ],
    });

    await qc.invalidateQueries({ queryKey: ["notifications"] });
    await waitFor(() =>
      expect(screen.getByLabelText("2 unread notifications")).toBeTruthy(),
    );
    expect(window.localStorage.getItem("saloon_erp_last_played_notification_id")).toBe("n-new-2");
  });
});
