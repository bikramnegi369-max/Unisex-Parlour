import { apiClient as api } from "@/lib/api/axios";
import type {
  NotificationItem,
  NotificationTemplateItem,
  NotificationAutomationItem,
} from "../types/notification.types";

export const notificationsApi = {
  listNotifications: async (params: { page?: number; limit?: number; channel?: string; status?: string; purpose?: string }) => {
    const res = await api.get("/notifications", { params });
    return res.data as {
      success: boolean;
      data: NotificationItem[];
      pagination: { page: number; limit: number; total: number };
    };
  },

  getNotificationById: async (id: string) => {
    const res = await api.get(`/notifications/${id}`);
    return res.data as { success: boolean; data: NotificationItem };
  },

  listTemplates: async () => {
    const res = await api.get("/notifications/templates");
    return res.data as { success: boolean; data: NotificationTemplateItem[] };
  },

  upsertTemplate: async (payload: {
    eventType: string;
    channel: "email" | "sms";
    purpose: string;
    subject?: string;
    body: string;
    allowedVariables?: string[];
    isActive?: boolean;
  }) => {
    const res = await api.post("/notifications/templates", payload);
    return res.data as { success: boolean; data: NotificationTemplateItem };
  },

  previewTemplate: async (payload: {
    eventType: string;
    channel: "email" | "sms";
    variables?: Record<string, unknown>;
  }) => {
    const res = await api.post("/notifications/templates/preview", payload);
    return res.data as {
      success: boolean;
      data: { subject: string; body: string; source: string };
    };
  },

  listAutomations: async () => {
    const res = await api.get("/notifications/automations");
    return res.data as { success: boolean; data: NotificationAutomationItem[] };
  },

  createAutomation: async (payload: Record<string, unknown>) => {
    const res = await api.post("/notifications/automations", payload);
    return res.data as { success: boolean; data: NotificationAutomationItem };
  },

  toggleAutomation: async (id: string, isEnabled: boolean) => {
    const res = await api.patch(`/notifications/automations/${id}/toggle`, { isEnabled });
    return res.data as { success: boolean; data: NotificationAutomationItem };
  },

  updateAutomationSchedule: async (id: string, scheduleCron: string) => {
    const res = await api.patch(`/notifications/automations/${id}/schedule`, { scheduleCron });
    return res.data as { success: boolean; data: NotificationAutomationItem };
  },

  deleteAutomation: async (id: string) => {
    const res = await api.delete(`/notifications/automations/${id}`);
    return res.data as { success: boolean; data: NotificationAutomationItem };
  },

  getInbox: async (params: { cursor?: string; page?: number; limit?: number } = {}) => {
    const res = await api.get("/notifications/inbox", { params });
    return res.data as {
      success: boolean;
      data: Array<{
        _id: string;
        notificationId: string;
        eventType: string;
        purpose: string;
        channel: string;
        branchId: string | null;
        createdAt: string;
        readAt: string | null;
        isRead: boolean;
        metadata?: Record<string, unknown>;
      }>;
      unreadCount: number;
      pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore?: boolean;
        nextCursor?: string | null;
      };
    };
  },

  markInboxItemRead: async (id: string) => {
    const res = await api.patch(`/notifications/inbox/${id}/read`);
    return res.data as {
      success: boolean;
      data: { _id: string; readAt: string; isRead: boolean };
    };
  },

  markAllInboxRead: async () => {
    const res = await api.patch("/notifications/inbox/read-all");
    return res.data as { success: boolean; modifiedCount: number };
  },
};
