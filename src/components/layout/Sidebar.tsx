"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebarCollapse } from "@/store/slices/uiSlice";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  X,
} from "lucide-react";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: SidebarItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Billing / POS", href: "/billing", icon: Receipt },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Employees", href: "/employees", icon: UserCheck },
  { name: "Services", href: "/services", icon: Scissors },
  { name: "Memberships", href: "/memberships", icon: CreditCard },
  { name: "Coupons", href: "/coupons", icon: Ticket },
  { name: "Loyalty", href: "/loyalty", icon: Award },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Finance", href: "/finance", icon: CircleDollarSign },
  { name: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { name: "Users", href: "/users", icon: Users },
  { name: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
  { name: "Activity Logs", href: "/activity-logs", icon: ClipboardList },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isCollapsedSelector = useAppSelector((state) => state.ui.sidebarCollapsed);
  
  // Mobile drawer sidebar should never render in collapsed icon-only mode
  const isCollapsed = isMobile ? false : isCollapsedSelector;

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out z-20 shrink-0 overflow-x-hidden",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Header / Branding */}
      <div className="flex items-center justify-between h-16 border-b border-sidebar-border shrink-0 px-6">
        {isCollapsed ? (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Scissors className="h-[18px] w-[18px]" />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Scissors className="h-5 w-5" />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                Unisex Parlour
              </span>
            </div>
            
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

      {/* Navigation Items */}
      <nav className={cn("flex-1 py-4 overflow-y-auto overflow-x-hidden space-y-1 scrollbar-thin", isCollapsed ? "px-1" : "px-3")}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all group relative h-10",
                isCollapsed ? "justify-center w-12 mx-auto" : "px-3.5 w-full",
                isActive
                  ? "bg-primary/5 text-primary before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-primary before:rounded-r"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/75"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                  isCollapsed ? "" : "mr-3",
                  isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                )}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {/* Styled Tooltip on Collapsed */}
              {isCollapsed && (
                <div className="absolute left-16 invisible opacity-0 group-hover:visible group-hover:opacity-100 bg-popover text-popover-foreground text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-all duration-150 whitespace-nowrap z-50 shadow-lg border border-border ml-2">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer - Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border shrink-0 bg-sidebar-accent/10">
        <button
          onClick={() => dispatch(toggleSidebarCollapse())}
          className={cn(
            "flex items-center justify-center w-full h-10 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground/75 hover:text-sidebar-foreground transition-all cursor-pointer",
            isCollapsed ? "w-12 mx-auto px-0" : "px-3 gap-2"
          )}
        >
          {isCollapsed ? (
            <ChevronRight size={18} />
          ) : (
            <>
              <ChevronLeft size={18} />
              <span className="text-xs font-semibold">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
