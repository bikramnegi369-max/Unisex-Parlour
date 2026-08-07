"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebar, toggleTheme } from "@/store/slices/uiSlice";
import { Bell, Menu, Search, Sun, Moon, LogOut, Settings, User as UserIcon, CheckCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import BranchSwitcher from "./BranchSwitcher";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
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
    <header className="relative flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b border-border z-20 shrink-0 select-none shadow-2xs">
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
          <Search className="absolute left-3 text-muted-foreground/70 pointer-events-none" size={15} />
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

      {/* Center Area: Branch Switcher */}
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
          {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
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
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-popover border border-border rounded-2xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground">Notifications</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">2 New</Badge>
                </div>
                <button
                  type="button"
                  className="text-[11px] text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border/40">
                <div className="p-3.5 hover:bg-muted/50 transition-colors cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">New Appointment Booked</p>
                    <span className="text-[10px] text-muted-foreground">5m ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Jane Doe booked <span className="font-semibold text-foreground">Classic Haircut & Blow Dry</span> for 2:30 PM today.
                  </p>
                </div>

                <div className="p-3.5 hover:bg-muted/50 transition-colors cursor-pointer space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">Payment Confirmed</p>
                    <span className="text-[10px] text-muted-foreground">1h ago</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Invoice <span className="font-semibold text-foreground">#POS-2894</span> was successfully settled via UPI.
                  </p>
                </div>
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
              <span className="text-xs font-bold text-foreground truncate">{user?.name || "User Account"}</span>
              <span className="text-[10px] text-muted-foreground capitalize truncate">{user?.role || "Staff"}</span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-2xl shadow-xl z-50 p-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 space-y-1">
              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <p className="text-xs font-bold text-foreground truncate">{user?.name || "User Account"}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email || "user@example.com"}</p>
                <Badge variant="outline" className="mt-2 text-[9px] px-2 py-0 capitalize">
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
