export type NotificationChannel = "email" | "sms" | "whatsapp" | "in_app";
export type NotificationStatus =
  | "pending"
  | "queued"
  | "processing"
  | "sent"
  | "delivered"
  | "failed"
  | "cancelled";
export type NotificationPurpose =
  | "transactional"
  | "reminder"
  | "operational"
  | "marketing"
  | "payroll";

export interface NotificationItem {
  _id: string;
  notificationId: string;
  organizationId: string;
  branchId?: string | null;
  eventType: string;
  purpose: NotificationPurpose;
  recipientType: string;
  recipientId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  isRead?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationTemplateItem {
  _id: string;
  organizationId?: string | null;
  eventType: string;
  channel: "email" | "sms";
  purpose: NotificationPurpose;
  subject?: string;
  body: string;
  allowedVariables: string[];
  isActive: boolean;
}

export interface NotificationAutomationItem {
  _id: string;
  organizationId: string;
  branchId?: string | null;
  name: string;
  description?: string;
  triggerType: "event" | "schedule";
  eventType: string;
  scheduleCron?: string | null;
  channel: "email" | "sms";
  purpose: NotificationPurpose;
  isEnabled: boolean;
  createdAt: string;
}
