"use client";

import React, { useMemo, useState } from "react";
import type {
  NotificationItem,
  NotificationTemplateItem,
  NotificationAutomationItem,
} from "../types/notification.types";
import {
  Bell,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Pencil,
  RotateCcw,
  Plus,
  Trash2,
  Pause,
  Play,
  Loader2,
  X,
} from "lucide-react";
import PermissionGate from "@/components/layout/PermissionGate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useInfiniteNotificationInbox,
  useMarkInboxItemRead,
  useMarkAllInboxRead,
  useNotificationsList,
  useNotificationDetail,
  useNotificationTemplates,
  useUpsertTemplate,
  usePreviewTemplate,
  useNotificationAutomations,
  useCreateAutomation,
  useToggleAutomation,
  useUpdateAutomationSchedule,
  useDeleteAutomation,
} from "../hooks/useNotifications";
import {
  NOTIFICATION_EVENT_CATALOG,
  EVENT_META_BY_TYPE,
  getEventLabel,
  getSampleVariables,
  type NotificationCategory,
  type NotificationEventMeta,
} from "../constants/notificationCatalog";

type ActiveTab = "inbox" | "logs" | "templates" | "automations";

const CATEGORIES: Array<"All" | NotificationCategory> = [
  "All",
  "Appointments",
  "Billing & Invoices",
  "Memberships & Subscriptions",
  "Staff & HR",
  "Customers",
  "Account & Security",
  "Inventory",
  "Supplier & Procurement",
];

const SCHEDULE_PRESETS = [
  { label: "Every 15 minutes", cron: "*/15 * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Daily at 9:00 AM", cron: "0 9 * * *" },
  { label: "Daily at 6:00 PM", cron: "0 18 * * *" },
];

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "sent" || normalized === "delivered") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  if (normalized === "failed" || normalized === "bounced") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
      <AlertCircle className="w-3 h-3 mr-1" />
      {status || "queued"}
    </Badge>
  );
}

export function NotificationsWorkspace() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("inbox");

  // Logs state
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [selectedNotificationId, setSelectedNotificationId] = useState<
    string | null
  >(null);

  // Template Studio state
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | NotificationCategory
  >("All");
  const [templateChannel, setTemplateChannel] = useState<"email" | "sms">(
    "email",
  );
  const [editingEvent, setEditingEvent] =
    useState<NotificationEventMeta | null>(null);
  const [editorSubject, setEditorSubject] = useState("");
  const [editorBody, setEditorBody] = useState("");
  const [previewResult, setPreviewResult] = useState<{
    subject?: string;
    body?: string;
    html?: string;
  } | null>(null);

  // Automations state
  const [newAutoName, setNewAutoName] = useState("");
  const [newAutoEvent, setNewAutoEvent] = useState("appointment.reminder_due");
  const [newAutoChannel, setNewAutoChannel] = useState<"email" | "sms">(
    "email",
  );
  const [newAutoCron, setNewAutoCron] = useState("0 9 * * *");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Queries
  const inboxQuery = useInfiniteNotificationInbox(20, activeTab === "inbox");
  const markOneRead = useMarkInboxItemRead();
  const markAllRead = useMarkAllInboxRead();
  const logsQuery = useNotificationsList({
    page,
    limit: 20,
    ...(channelFilter !== "all" ? { channel: channelFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(eventFilter !== "all" ? { eventType: eventFilter } : {}),
    ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
  });
  const detailQuery = useNotificationDetail(selectedNotificationId || "");
  const templatesQuery = useNotificationTemplates();
  const automationsQuery = useNotificationAutomations();

  // Mutations
  const upsertTemplate = useUpsertTemplate();
  const previewTemplate = usePreviewTemplate();
  const createAutomation = useCreateAutomation();
  const toggleAutomation = useToggleAutomation();
  const updateSchedule = useUpdateAutomationSchedule();
  const deleteAutomation = useDeleteAutomation();

  const logs = logsQuery.data?.data ?? [];
  const totalLogs = logsQuery.data?.pagination?.total ?? logs.length;
  const totalPages = Math.max(1, Math.ceil(totalLogs / 20));

  const savedTemplateMap = useMemo(() => {
    const savedTemplates =
      templatesQuery.data?.data ?? templatesQuery.data ?? [];
    const map = new Map<string, NotificationTemplateItem>();
    if (Array.isArray(savedTemplates)) {
      for (const tpl of savedTemplates) {
        map.set(`${tpl.eventType}:${tpl.channel}`, tpl);
      }
    }
    return map;
  }, [templatesQuery.data]);

  const filteredCatalog = useMemo(() => {
    if (selectedCategory === "All") return NOTIFICATION_EVENT_CATALOG;
    return NOTIFICATION_EVENT_CATALOG.filter(
      (item) => item.category === selectedCategory,
    );
  }, [selectedCategory]);

  const openTemplateEditor = async (
    meta: NotificationEventMeta,
    channel: "email" | "sms",
  ) => {
    setEditingEvent(meta);
    setTemplateChannel(channel);
    const existing = savedTemplateMap.get(`${meta.eventType}:${channel}`);
    const subject =
      existing?.subject ??
      (channel === "email" ? meta.defaultEmailSubject : "");
    const body =
      existing?.body ??
      (channel === "email" ? meta.defaultEmailBody : meta.defaultSmsBody);
    setEditorSubject(subject);
    setEditorBody(body);
    try {
      const res = await previewTemplate.mutateAsync({
        eventType: meta.eventType,
        channel,
        variables: getSampleVariables(meta.eventType),
      });
      setPreviewResult(res?.data ?? res);
    } catch {
      setPreviewResult({ subject, body });
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingEvent) return;
    await upsertTemplate.mutateAsync({
      eventType: editingEvent.eventType,
      channel: templateChannel,
      purpose: "transactional",
      subject: templateChannel === "email" ? editorSubject : "",
      body: editorBody,
      allowedVariables: editingEvent.variables.map((v) => v.key),
      isActive: true,
    });
    const res = await previewTemplate.mutateAsync({
      eventType: editingEvent.eventType,
      channel: templateChannel,
      variables: getSampleVariables(editingEvent.eventType),
    });
    setPreviewResult(res?.data ?? res);
  };

  const handleResetToDefault = () => {
    if (!editingEvent) return;
    setEditorSubject(
      templateChannel === "email" ? editingEvent.defaultEmailSubject : "",
    );
    setEditorBody(
      templateChannel === "email"
        ? editingEvent.defaultEmailBody
        : editingEvent.defaultSmsBody,
    );
  };

  const handleInsertVariable = (key: string) => {
    setEditorBody(
      (prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}{{${key}}}`,
    );
  };

  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAutoName.trim()) return;
    await createAutomation.mutateAsync({
      name: newAutoName.trim(),
      eventType: newAutoEvent,
      channel: newAutoChannel,
      scheduleCron: newAutoCron,
      isEnabled: true,
    });
    setNewAutoName("");
  };

  const automations = Array.isArray(automationsQuery.data)
    ? automationsQuery.data
    : automationsQuery.data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Notifications &amp; Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage customer &amp; staff messages, customize email/SMS templates,
            and schedule automated reminders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Email &amp; SMS Active
          </Badge>
          <Badge variant="secondary" className="text-xs">
            WhatsApp: Pending / Not Configured
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <Button
          variant={activeTab === "inbox" ? "default" : "ghost"}
          onClick={() => setActiveTab("inbox")}
          size="sm"
        >
          <Bell className="w-4 h-4 mr-2" />
          My Inbox
        </Button>
        <PermissionGate permission="logs.view">
          <Button
            variant={activeTab === "logs" ? "default" : "ghost"}
            onClick={() => setActiveTab("logs")}
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notification Logs
          </Button>
        </PermissionGate>
        <PermissionGate permission="notifications.templates.view">
          <Button
            variant={activeTab === "templates" ? "default" : "ghost"}
            onClick={() => setActiveTab("templates")}
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Template Studio
          </Button>
        </PermissionGate>
        <PermissionGate permission="notifications.automations.manage">
          <Button
            variant={activeTab === "automations" ? "default" : "ghost"}
            onClick={() => setActiveTab("automations")}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            Automations
          </Button>
        </PermissionGate>
      </div>

      {/* TAB 0: MY INBOX */}
      {activeTab === "inbox" && (() => {
        const pages = inboxQuery.data?.pages ?? [];
        const seen = new Set<string>();
        const items: typeof pages[number]["data"] = [];
        for (const p of pages) {
          for (const item of p.data ?? []) {
            if (!seen.has(item._id)) {
              seen.add(item._id);
              items.push(item);
            }
          }
        }
        const unreadCount = pages[0]?.unreadCount ?? 0;

        return (
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  My Inbox
                  {unreadCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {unreadCount} Unread
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your personal notifications, newest first.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {inboxQuery.isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading your inbox...
                </div>
              ) : inboxQuery.isError ? (
                <div className="text-center py-10 space-y-2 border rounded-lg">
                  <p className="text-sm text-destructive">Failed to load your inbox.</p>
                  <Button variant="outline" size="sm" onClick={() => inboxQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  You&apos;re all caught up! No notifications yet.
                </div>
              ) : (
                <div className="divide-y border rounded-lg">
                  {items.map((item) => {
                    const meta = EVENT_META_BY_TYPE[item.eventType];
                    return (
                      <div
                        key={item._id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          item.isRead ? "opacity-75" : "bg-primary/5"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {!item.isRead && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                            <span className="font-semibold text-sm">
                              {getEventLabel(item.eventType)}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {item.channel}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {meta?.description || "Notification update"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!item.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={markOneRead.isPending}
                            onClick={() => markOneRead.mutate(item._id)}
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {inboxQuery.hasNextPage && (
                <div className="pt-2 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={inboxQuery.isFetchingNextPage}
                    onClick={() => inboxQuery.fetchNextPage()}
                  >
                    {inboxQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* TAB 1: NOTIFICATION LOGS */}
      {activeTab === "logs" && (
        <PermissionGate permission="logs.view">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Delivery History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track every email and SMS sent by your salon.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logsQuery.refetch()}
                disabled={logsQuery.isFetching}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${logsQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search recipient..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <select
                  aria-label="Filter by channel"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={channelFilter}
                  onChange={(e) => {
                    setChannelFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Channels</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
                <select
                  aria-label="Filter by status"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="queued">Queued</option>
                  <option value="failed">Failed</option>
                </select>
                <select
                  aria-label="Filter by event"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={eventFilter}
                  onChange={(e) => {
                    setEventFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Events</option>
                  {NOTIFICATION_EVENT_CATALOG.map((ev) => (
                    <option key={ev.eventType} value={ev.eventType}>
                      {ev.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Table */}
              {logsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Loading notification logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  No notifications found matching your filters.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-3 font-medium">Event</th>
                        <th className="p-3 font-medium">Recipient</th>
                        <th className="p-3 font-medium">Channel</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Sent At</th>
                        <th className="p-3 font-medium text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {logs.map((log: NotificationItem) => (
                        <tr
                          key={log._id}
                          className="hover:bg-muted/30"
                        >
                          <td className="p-3 font-medium">
                            {getEventLabel(log.eventType)}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {log.recipientId || "—"}
                          </td>
                          <td className="p-3 uppercase text-xs font-semibold">
                            {log.channel}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={log.status} />
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedNotificationId(log._id)
                              }
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} ({totalLogs} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail Drawer */}
          {selectedNotificationId && (
            <Card className="mt-4 border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {getEventLabel(detailQuery.data?.data?.eventType || "")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Notification Delivery Details
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNotificationId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {detailQuery.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  (() => {
                    const d: Partial<NotificationItem> & {
                      subject?: string;
                      errorMessage?: string;
                    } = detailQuery.data?.data ?? {};
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="font-medium">Recipient:</span>{" "}
                          {d.recipientId || "—"}
                        </div>
                        <div>
                          <span className="font-medium">Channel:</span>{" "}
                          {String(d.channel || "").toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>{" "}
                          <StatusBadge status={d.status || "pending"} />
                        </div>
                        <div>
                          <span className="font-medium">Subject:</span>{" "}
                          {d.subject || "—"}
                        </div>
                        {d.errorMessage && (
                          <div className="sm:col-span-2 text-red-600 bg-red-50 p-2 rounded">
                            Error: {d.errorMessage}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          )}
        </PermissionGate>
      )}

      {/* TAB 2: TEMPLATE STUDIO */}
      {activeTab === "templates" && (
        <PermissionGate permission="notifications.templates.view">
          <div className="space-y-6">
            {/* Category & Channel Controls */}
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filter by Category
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 shrink-0">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-right">
                  Channel
                </div>
                <div className="inline-flex rounded-lg bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setTemplateChannel("email")}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      templateChannel === "email"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Email Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateChannel("sms")}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      templateChannel === "sms"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    SMS Templates
                  </button>
                </div>
              </div>
            </div>

            {/* Editor + Live Preview Panel */}
            {editingEvent && (
              <Card className="border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {editingEvent.label} ({templateChannel.toUpperCase()})
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {editingEvent.description} • Sent to:{" "}
                      <strong>{editingEvent.recipient}</strong>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEvent(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Guided Editor */}
                  <div className="space-y-4">
                    {templateChannel === "email" && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Email Subject
                        </label>
                        <Input
                          value={editorSubject}
                          onChange={(e) => setEditorSubject(e.target.value)}
                          placeholder="Enter email subject..."
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        {templateChannel === "email"
                          ? "Email Body"
                          : "SMS Message"}
                      </label>
                      <textarea
                        className="w-full min-h-40 rounded-md border bg-background p-3 text-sm"
                        value={editorBody}
                        onChange={(e) => setEditorBody(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Insert Dynamic Field:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {editingEvent.variables.map((v) => (
                          <Button
                            key={v.key}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleInsertVariable(v.key)}
                          >
                            + {v.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <PermissionGate permission="notifications.templates.update">
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={handleSaveTemplate}
                          disabled={upsertTemplate.isPending}
                        >
                          {upsertTemplate.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Save Template
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResetToDefault}
                        >
                          <RotateCcw className="w-4 h-4 mr-1.5" />
                          Reset to Default
                        </Button>
                      </div>
                    </PermissionGate>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Live Preview</div>
                    {templateChannel === "email" ? (
                      <div className="border rounded-lg overflow-hidden bg-zinc-50">
                        <div className="px-3 py-2 bg-muted text-xs border-b">
                          <strong>Subject:</strong>{" "}
                          {previewResult?.subject || editorSubject}
                        </div>
                        <iframe
                          title="Email preview"
                          className="w-full h-80 bg-white"
                          srcDoc={
                            previewResult?.html ||
                            previewResult?.body ||
                            editorBody
                          }
                        />
                      </div>
                    ) : (
                      <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-bl-sm p-3 text-sm max-w-sm">
                          {previewResult?.body || editorBody}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(previewResult?.body || editorBody).length}{" "}
                          characters
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Template Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map((meta) => {
                const isCustomized = savedTemplateMap.has(
                  `${meta.eventType}:${templateChannel}`,
                );
                return (
                  <Card
                    key={meta.eventType}
                    className="flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-xs">
                          {meta.category}
                        </Badge>
                        <Badge
                          variant={isCustomized ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isCustomized ? "Customized" : "Built-in Default"}
                        </Badge>
                      </div>
                      <CardTitle className="text-base pt-2">
                        {meta.label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {meta.description}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        To: {meta.recipient}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openTemplateEditor(meta, templateChannel)
                        }
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Customize / Preview
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </PermissionGate>
      )}

      {/* TAB 3: AUTOMATIONS */}
      {activeTab === "automations" && (
        <PermissionGate permission="notifications.automations.manage">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Automation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  New Scheduled Automation
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Automatically send reminders or alerts on a recurring
                  schedule.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAutomation} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Automation Name
                    </label>
                    <Input
                      placeholder="e.g. Morning Appointment Reminders"
                      value={newAutoName}
                      onChange={(e) => setNewAutoName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Notification Event
                    </label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={newAutoEvent}
                      onChange={(e) => setNewAutoEvent(e.target.value)}
                    >
                      {NOTIFICATION_EVENT_CATALOG.map((ev) => (
                        <option key={ev.eventType} value={ev.eventType}>
                          {ev.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Channel</label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={newAutoChannel}
                      onChange={(e) =>
                        setNewAutoChannel(e.target.value as "email" | "sms")
                      }
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Schedule</label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={newAutoCron}
                      onChange={(e) => setNewAutoCron(e.target.value)}
                    >
                      {SCHEDULE_PRESETS.map((p) => (
                        <option key={p.cron} value={p.cron}>
                          {p.label} ({p.cron})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createAutomation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Automation
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active Automations List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Configured Automations
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Pause, resume, or update schedules for your active workflows.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationsQuery.isLoading ? (
                  <div className="flex items-center py-8 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading automations...
                  </div>
                ) : automations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    No automations configured yet.
                  </div>
                ) : (
                  automations.map((auto: NotificationAutomationItem) => {
                    const id = auto._id;
                    const meta = EVENT_META_BY_TYPE[auto.eventType];
                    return (
                      <div
                        key={id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{auto.name}</span>
                            <Badge
                              variant={auto.isEnabled ? "default" : "secondary"}
                            >
                              {auto.isEnabled ? "Active" : "Paused"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {meta?.label || auto.eventType} •{" "}
                            {String(auto.channel || "").toUpperCase()} •
                            Schedule: <code>{auto.scheduleCron}</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleAutomation.mutate({
                                id,
                                isEnabled: !auto.isEnabled,
                              })
                            }
                          >
                            {auto.isEnabled ? (
                              <>
                                <Pause className="w-3.5 h-3.5 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateSchedule.mutate({
                                id,
                                scheduleCron:
                                  auto.scheduleCron === "0 9 * * *"
                                    ? "0 18 * * *"
                                    : "0 9 * * *",
                              })
                            }
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Switch Time
                          </Button>
                          {confirmDeleteId === id ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                deleteAutomation.mutate(id);
                                setConfirmDeleteId(null);
                              }}
                            >
                              Confirm Delete
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDeleteId(id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </PermissionGate>
      )}
    </div>
  );
}
