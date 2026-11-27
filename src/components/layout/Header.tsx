"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebar, toggleTheme } from "@/store/slices/uiSlice";
import {
  Bell,
  Menu,
  Search,
  Sun,
  Moon,
  LogOut,
  Settings,
  CheckCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useState, useRef, useEffect, useMemo } from "react";
import BranchSwitcher from "./BranchSwitcher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  useInfiniteNotificationInbox,
  useMarkInboxItemRead,
  useMarkAllInboxRead,
} from "@/features/notifications/hooks/useNotifications";
import {
  getEventLabel,
  EVENT_META_BY_TYPE,
} from "@/features/notifications/constants/notificationCatalog";
import {
  getNotificationSoundPrefs,
  saveNotificationSoundPrefs,
  hasPlayedNotificationSound,
  markNotificationSoundPlayed,
  playNotificationChime,
  unlockNotificationAudio,
  type NotificationSoundPrefs,
} from "@/features/notifications/utils/notificationSound";

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return "";
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getNotificationHref(eventType: string): string | null {
  if (eventType.startsWith("appointment.")) return "/appointments";
  if (eventType.startsWith("invoice.")) return "/billing";
  if (
    eventType.startsWith("leave.") ||
    eventType.startsWith("attendance.") ||
    eventType.startsWith("payroll.")
  ) {
    return "/hr";
  }
  if (eventType.startsWith("customer.")) return "/customers";
  if (
    eventType.startsWith("subscription.") ||
    eventType.startsWith("membership.")
  )
    return "/memberships";
  if (eventType.startsWith("inventory.")) return "/inventory";
  if (eventType.startsWith("procurement.")) return "/procurement";
  return null;
}

export default function Header() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const theme = useAppSelector((state) => state.ui.theme);
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundPrefs, setSoundPrefs] = useState<NotificationSoundPrefs>(() =>
    getNotificationSoundPrefs(),
  );
  const hasInitializedInboxRef = useRef(false);

  const inboxQuery = useInfiniteNotificationInbox(8, Boolean(user));
  const markOneRead = useMarkInboxItemRead();
  const markAllRead = useMarkAllInboxRead();

  const inboxItems = useMemo(() => {
    const pages = inboxQuery.data?.pages ?? [];
    const seen = new Set<string>();
    const merged: (typeof pages)[number]["data"] = [];
    for (const p of pages) {
      for (const item of p.data ?? []) {
        if (!seen.has(item._id)) {
          seen.add(item._id);
          merged.push(item);
        }
      }
    }
    return merged;
  }, [inboxQuery.data?.pages]);
  const unreadCount = inboxQuery.data?.pages?.[0]?.unreadCount ?? 0;

  const handleInboxScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 48 &&
      inboxQuery.hasNextPage &&
      !inboxQuery.isFetchingNextPage
    ) {
      void inboxQuery.fetchNextPage();
    }
  };

  // Unlock Web Audio API on first user gesture
  useEffect(() => {
    const handleUnlock = () => {
      void unlockNotificationAudio();
    };
    window.addEventListener("pointerdown", handleUnlock, { once: true });
    window.addEventListener("keydown", handleUnlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
    };
  }, []);

  useEffect(() => {
    if (!inboxQuery.isSuccess) return;
    const latest = inboxItems[0];
    if (!hasInitializedInboxRef.current) {
      hasInitializedInboxRef.current = true;
      if (latest?._id) {
        markNotificationSoundPlayed(latest._id);
      }
      return;
    }
    if (
      latest &&
      !latest.isRead &&
      soundPrefs.enabled &&
      !hasPlayedNotificationSound(latest._id)
    ) {
      void playNotificationChime(soundPrefs.volume).then((played) => {
        if (played) {
          markNotificationSoundPlayed(latest._id);
        }
      });
    }
  }, [inboxQuery.isSuccess, inboxItems, soundPrefs.enabled, soundPrefs.volume]);

  const updateSoundPrefs = (next: NotificationSoundPrefs) => {
    setSoundPrefs(next);
    saveNotificationSoundPrefs(next);
  };

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get initials for profile avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="relative flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border z-30 shrink-0 select-none shadow-2xs">
      {/* Left Area: Mobile Menu Toggle & Search Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 -ml-1 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground md:hidden cursor-pointer transition-colors"
          aria-label="Toggle navigation drawer"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Input */}
        <div className="hidden sm:flex items-center w-72 md:w-80 relative">
          <Search
            className="absolute left-3 text-muted-foreground/70 pointer-events-none"
            size={15}
          />
          <input
            type="text"
            placeholder="Search appointments, customers, services..."
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/80 focus:border-primary rounded-xl outline-none transition-all placeholder:text-muted-foreground/70"
          />
          <kbd className="absolute right-3 hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Center Area: Branch Switcher (desktop/tablet header; mobile has dedicated branch switcher in drawer sidebar) */}
      <div className="hidden md:block">
        <BranchSwitcher />
      </div>

      {/* Right Area: Actions, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Switcher Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 flex h-2 w-2"
                aria-label={`${unreadCount} unread notifications`}
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {unreadCount} New
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  disabled={unreadCount === 0 || markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  className="text-[11px] text-primary font-semibold hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              </div>

              <div
                onScroll={handleInboxScroll}
                className="max-h-80 overflow-y-auto divide-y divide-border/40"
              >
                {inboxQuery.isLoading ? (
                  <div className="p-4 space-y-3">
                    <div className="h-10 rounded-lg bg-muted/50 animate-pulse" />
                    <div className="h-10 rounded-lg bg-muted/50 animate-pulse" />
                  </div>
                ) : inboxQuery.isError ? (
                  <div className="p-5 text-center space-y-2">
                    <p className="text-xs text-destructive">
                      Could not load notifications.
                    </p>
                    <button
                      type="button"
                      onClick={() => inboxQuery.refetch()}
                      className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : inboxItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    You&apos;re all caught up! No notifications yet.
                  </div>
                ) : (
                  inboxItems.map((item) => {
                    const title = getEventLabel(item.eventType);
                    const description =
                      EVENT_META_BY_TYPE[item.eventType]?.description ||
                      "Notification update";
                    const href = getNotificationHref(item.eventType);
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => {
                          if (!item.isRead) {
                            markOneRead.mutate(item._id);
                          }
                          if (href) {
                            setShowNotifications(false);
                            router.push(href);
                          }
                        }}
                        className={`w-full text-left p-3.5 hover:bg-muted/50 transition-colors cursor-pointer space-y-1 ${
                          item.isRead ? "opacity-75" : "bg-primary/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!item.isRead && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <p className="text-xs font-bold text-foreground truncate">
                              {title}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {description}
                        </p>
                      </button>
                    );
                  })
                )}
                {inboxQuery.isFetchingNextPage && (
                  <div className="p-3 text-center text-[11px] text-muted-foreground">
                    Loading older notifications...
                  </div>
                )}
                {inboxQuery.isFetchNextPageError && (
                  <div className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => inboxQuery.fetchNextPage()}
                      className="text-[11px] text-primary font-semibold hover:underline cursor-pointer"
                    >
                      Retry loading more
                    </button>
                  </div>
                )}
              </div>

              <div className="px-4 py-2 border-t border-border bg-muted/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={
                      soundPrefs.enabled
                        ? "Mute notification sound"
                        : "Unmute notification sound"
                    }
                    onClick={() =>
                      updateSoundPrefs({
                        ...soundPrefs,
                        enabled: !soundPrefs.enabled,
                      })
                    }
                    className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    title={soundPrefs.enabled ? "Mute sound" : "Unmute sound"}
                  >
                    {soundPrefs.enabled ? (
                      <Volume2 className="h-3.5 w-3.5" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {soundPrefs.enabled && (
                    <input
                      type="range"
                      aria-label="Notification sound volume"
                      min={0}
                      max={100}
                      value={Math.round(soundPrefs.volume * 100)}
                      onChange={(e) =>
                        updateSoundPrefs({
                          ...soundPrefs,
                          volume: Number(e.target.value) / 100,
                        })
                      }
                      className="w-16 h-1 accent-primary cursor-pointer"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => playNotificationChime(soundPrefs.volume)}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    Test
                  </button>
                </div>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-primary/20">
              {getInitials(user?.name)}
            </div>
            <div className="hidden lg:flex flex-col text-left min-w-0 pr-1">
              <span className="text-xs font-bold text-foreground truncate">
                {user?.name || "User Account"}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize truncate">
                {user?.role || "Staff"}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-2xl shadow-xl z-50 p-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 space-y-1">
              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.name || "User Account"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {user?.email || "user@example.com"}
                </p>
                <Badge
                  variant="outline"
                  className="mt-2 text-[9px] px-2 py-0 capitalize"
                >
                  {user?.role || "Staff"}
                </Badge>
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Account Settings
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-semibold text-destructive rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-destructive" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
