"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebarCollapse } from "@/store/slices/uiSlice";
import { cn } from "@/lib/utils";
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

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out z-20 shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!isCollapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Unisex Parlour ERP
          </span>
        )}
        <button
          onClick={() => dispatch(toggleSidebarCollapse())}
          className={cn(
            "p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer",
            isCollapsed && "mx-auto"
          )}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "hover:bg-slate-800/60 hover:text-slate-100 text-slate-400"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {/* Tooltip on Collapsed */}
              {isCollapsed && (
                <div className="absolute left-14 invisible opacity-0 group-hover:visible group-hover:opacity-100 bg-slate-950 text-slate-100 text-xs rounded px-2 py-1.5 transition-all whitespace-nowrap z-50 shadow-md">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
