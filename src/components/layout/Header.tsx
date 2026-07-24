"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebar, toggleTheme } from "@/store/slices/uiSlice";
import { Bell, Menu, Search, Sun, Moon } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useState } from "react";

export default function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Get initials for profile placeholder
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-card border-b border-border z-10 shrink-0">
      {/* Mobile Sidebar Hamburger Toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Search Input Container */}
      <div className="hidden sm:flex items-center w-80 relative">
        <Search className="absolute left-3 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search appointments, customers, services..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 hover:bg-muted focus:bg-background border border-border/80 focus:border-primary rounded-lg outline-none transition-all placeholder:text-muted-foreground"
        />
      </div>

      {/* Actions and Profile */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Dropdown Panel */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors relative cursor-pointer"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-2 border-b border-border flex justify-between items-center">
                <span className="font-semibold text-sm">Notifications</span>
                <span className="text-xs text-primary font-medium hover:underline cursor-pointer">Mark all read</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <div className="px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="text-xs font-semibold">New Booking</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Jane Doe booked Classic Haircut for 2:30 PM today</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">5m ago</span>
                </div>
                <div className="px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                  <p className="text-xs font-semibold">Payment Confirmed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Invoice #POS-2894 was paid via UPI</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">1h ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {getInitials(user?.name)}
            </div>
            <span className="hidden md:inline text-sm font-medium text-muted-foreground">
              {user?.name || "User"}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium text-foreground truncate">{user?.email || "user@example.com"}</p>
                <p className="text-[10px] font-semibold text-primary/80 mt-0.5">{user?.role || "Staff"}</p>
              </div>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-popover-foreground hover:bg-muted transition-colors"
              >
                Profile & Settings
              </a>
              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
