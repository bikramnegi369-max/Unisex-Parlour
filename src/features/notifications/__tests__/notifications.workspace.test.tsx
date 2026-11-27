import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationsWorkspace } from "../components/NotificationsWorkspace";
import { notificationsApi } from "../api/notifications.api";

vi.mock("@/components/layout/PermissionGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("NotificationsWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders notification logs from API", async () => {
    vi.spyOn(notificationsApi, "listNotifications").mockResolvedValue({
      success: true,
      data: [
        {
          _id: "n1",
          notificationId: "nid-1",
          organizationId: "org-1",
          eventType: "invoice.settled",
          purpose: "transactional",
          recipientType: "customer",
          recipientId: "c1",
          channel: "sms",
          status: "sent",
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <NotificationsWorkspace />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByText("Notification Logs"));

    expect(await screen.findByText("Invoice Settled")).toBeTruthy();
    expect(screen.getAllByText(/sent/i).length).toBeGreaterThan(0);
  });
});
