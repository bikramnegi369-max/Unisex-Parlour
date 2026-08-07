"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebarCollapse } from "@/store/slices/uiSlice";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { routePermissions, RoutePath } from "@/lib/permissions/routePermissions";
import {
  LayoutDashboard,
  Users,
  Calendar,
  UserCheck,
  Scissors,
  CreditCard,
  Ticket,
  Receipt,
  CircleDollarSign,
  Package,
  Truck,
  Award,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GitBranch,
  X,
  Sparkles,
} from "lucide-react";
import BranchSwitcher from "./BranchSwitcher";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const navGroups: SidebarGroup[] = [
  {
    title: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Billing / POS", href: "/billing", icon: Receipt },
      { name: "Appointments", href: "/appointments", icon: Calendar },
    ],
  },
  {
    title: "Operations",
    items: [
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Employees", href: "/employees", icon: UserCheck },
      { name: "Services", href: "/services", icon: Scissors },
    ],
  },
  {
    title: "Marketing",
    items: [
      { name: "Memberships", href: "/memberships", icon: CreditCard },
      { name: "Coupons", href: "/coupons", icon: Ticket },
      { name: "Loyalty", href: "/loyalty", icon: Award },
    ],
  },
  {
    title: "Supply Chain",
    items: [
      { name: "Inventory", href: "/inventory", icon: Package },
      { name: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Finance & Insights",
    items: [
      { name: "Finance", href: "/finance", icon: CircleDollarSign },
      { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "Administration",
    items: [
      { name: "Users", href: "/users", icon: Users },
      { name: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
      { name: "Branches", href: "/branches", icon: GitBranch },
      { name: "Activity Logs", href: "/activity-logs", icon: ClipboardList },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isCollapsedSelector = useAppSelector((state) => state.ui.sidebarCollapsed);

  // Mobile drawer sidebar should never render in collapsed mode
  const isCollapsed = isMobile ? false : isCollapsedSelector;

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out z-20 shrink-0 overflow-x-hidden select-none shadow-sm",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Header / Branding */}
      <div className="flex items-center justify-between h-16 border-b border-sidebar-border shrink-0 px-4">
        {isCollapsed ? (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105">
            <Scissors className="h-[18px] w-[18px]" />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-foreground leading-none flex items-center gap-1.5">
                  Unisex Parlour
                  <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500" />
                </span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-1">
                  ERP Platform
                </span>
              </div>
            </Link>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer md:hidden"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile Branch Switcher */}
      {isMobile && (
        <div className="px-4 py-3 border-b border-sidebar-border bg-muted/20">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Active Branch Location
          </p>
          <div className="w-full">
            <BranchSwitcher />
          </div>
        </div>
      )}

      {/* Navigation Items grouped by section */}
      <nav className={cn("flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-4 scrollbar-thin", isCollapsed ? "px-2" : "px-3")}>
        {navGroups.map((group) => {
          // Filter authorized items in group
          const visibleItems = group.items.filter((item) => {
            const requiredPermission = item.href in routePermissions
              ? routePermissions[item.href as RoutePath]
              : undefined;
            return !requiredPermission || hasPermission(user, requiredPermission);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/70 mb-1">
                  {group.title}
                </p>
              )}

              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group relative h-9.5",
                      isCollapsed ? "justify-center w-11 h-11 mx-auto my-1" : "px-3 w-full",
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-primary before:rounded-r"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                        isCollapsed ? "" : "mr-3",
                        isActive ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground"
                      )}
                    />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}

                    {/* Tooltip on Collapsed Mode */}
                    {isCollapsed && (
                      <div className="absolute left-16 invisible opacity-0 group-hover:visible group-hover:opacity-100 bg-popover text-popover-foreground text-xs font-bold rounded-lg px-3 py-1.5 transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-border ml-2 pointer-events-none">
                        {item.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer - Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border shrink-0 bg-sidebar-accent/10">
        <button
          onClick={() => dispatch(toggleSidebarCollapse())}
          className={cn(
            "flex items-center justify-center w-full h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer font-semibold text-xs",
            isCollapsed ? "w-11 mx-auto px-0" : "px-3 gap-2"
          )}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse Navigation</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
