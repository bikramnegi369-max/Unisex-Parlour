"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertTriangle, Clock, XCircle, Loader2, Info } from "lucide-react";
import type {
  AppointmentReminder,
  ReminderAggregateStatus,
  ReminderChannelStatus,
} from "../types/appointment.types";

interface AppointmentReminderStatusProps {
  reminder?: AppointmentReminder | null;
  compact?: boolean;
  className?: string;
}

export function getAggregateStatusLabel(status?: ReminderAggregateStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "scheduled":
      return "Scheduled";
    case "processing":
      return "Processing";
    case "sent":
      return "Sent";
    case "partial_delivery":
      return "Partially Delivered";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Disabled";
  }
}

export function getChannelStatusLabel(status?: ReminderChannelStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "scheduled":
      return "Scheduled";
    case "processing":
      return "Processing";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unscheduled";
  }
}

export function getChannelVariant(status?: ReminderChannelStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "sent":
      return "default";
    case "failed":
      return "destructive";
    case "scheduled":
    case "pending":
    case "processing":
      return "secondary";
    case "cancelled":
    default:
      return "outline";
  }
}

export function getAggregateVariant(status?: ReminderAggregateStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "sent":
      return "default";
    case "partial_delivery":
    case "failed":
      return "destructive";
    case "scheduled":
    case "pending":
    case "processing":
      return "secondary";
    case "cancelled":
    default:
      return "outline";
  }
}

export function AppointmentReminderStatus({
  reminder,
  compact = false,
  className = "",
}: AppointmentReminderStatusProps) {
  if (!reminder || !reminder.enabled) {
    if (compact) return null;
    return (
      <Badge variant="outline" className={`text-muted-foreground ${className}`}>
        <Bell className="h-3 w-3 mr-1 opacity-50" />
        Reminder Disabled
      </Badge>
    );
  }

  const { status, channel, email, sms } = reminder;

  if (compact) {
    // Compact representation for table rows & calendar cards
    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className={`text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 ${className}`} title="Reminder Sent">
            <CheckCircle2 className="h-3 w-3" />
            <span>Sent</span>
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 ${className}`} title="Reminder Scheduled">
            <Bell className="h-3 w-3" />
            <span>Scheduled</span>
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1 ${className}`} title="Reminder Sending">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Sending...</span>
          </Badge>
        );
      case "partial_delivery":
        return (
          <Badge variant="destructive" className={`text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 ${className}`} title="Partially Delivered (SMS/Email status differs)">
            <AlertTriangle className="h-3 w-3" />
            <span>Partial Delivery</span>
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${className}`} title={reminder.failureReason || "Reminder Delivery Failed"}>
            <AlertTriangle className="h-3 w-3" />
            <span>Reminder Failed</span>
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 text-muted-foreground flex items-center gap-1 ${className}`} title="Reminder Cancelled">
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 text-muted-foreground flex items-center gap-1 ${className}`}>
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
    }
  }

  // Full detailed display for AppointmentDetailsDialog
  const channelDisplay = channel === "both" ? "SMS + Email" : channel === "sms" ? "SMS" : "Email";

  return (
    <div className={`space-y-2 border border-border rounded-lg p-3 bg-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Reminder Notification</span>
          <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-semibold">
            {channelDisplay}
          </span>
        </div>
        <Badge variant={getAggregateVariant(status)} className="text-xs px-2 py-0.5">
          {getAggregateStatusLabel(status)}
        </Badge>
      </div>

      {status === "partial_delivery" && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Partial Delivery: </span>
            SMS: {getChannelStatusLabel(sms?.status)} | Email: {getChannelStatusLabel(email?.status)}
          </div>
        </div>
      )}

      {/* Per-channel Delivery Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/60">
        {(channel === "sms" || channel === "both") && (
          <div className="p-2 rounded bg-muted/40 border border-border/60 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-foreground flex items-center gap-1">
                <span>📱</span> SMS
              </span>
              <Badge variant={getChannelVariant(sms?.status)} className="text-[10px] px-1.5 py-0">
                {getChannelStatusLabel(sms?.status)}
              </Badge>
            </div>
            {sms?.sentAt && (
              <div className="text-[10px] text-muted-foreground">Sent: {sms.sentAt}</div>
            )}
            {sms?.status === "failed" && (
              <div className="text-[10px] text-destructive bg-destructive/10 p-1 rounded font-medium">
                {sms.failureReason || "SMS dispatch failed"}
              </div>
            )}
          </div>
        )}

        {(channel === "email" || channel === "both") && (
          <div className="p-2 rounded bg-muted/40 border border-border/60 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-foreground flex items-center gap-1">
                <span>✉️</span> Email
              </span>
              <Badge variant={getChannelVariant(email?.status)} className="text-[10px] px-1.5 py-0">
                {getChannelStatusLabel(email?.status)}
              </Badge>
            </div>
            {email?.sentAt && (
              <div className="text-[10px] text-muted-foreground">Sent: {email.sentAt}</div>
            )}
            {email?.status === "failed" && (
              <div className="text-[10px] text-destructive bg-destructive/10 p-1 rounded font-medium">
                {email.failureReason || "SMTP delivery failed"}
              </div>
            )}
          </div>
        )}
      </div>

      {reminder.failureReason && status !== "partial_delivery" && (
        <div className="text-[11px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 mt-1">
          <span className="font-semibold">Failure Details: </span>
          {reminder.failureReason}
        </div>
      )}
    </div>
  );
}
