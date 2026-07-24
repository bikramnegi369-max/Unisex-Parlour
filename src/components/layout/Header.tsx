"use client";

import { useAppDispatch, useAppSelector } from "@/hooks/store";
import { toggleSidebar } from "@/store/slices/uiSlice";
import { Bell, Menu, Search } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const dispatch = useAppDispatch();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 z-10 shrink-0">
      {/* Mobile Sidebar Hamburger Toggle */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:hidden cursor-pointer"
      >
        <Menu size={20} />
      </button>

      {/* Global Search Bar */}
      <div className="hidden md:flex items-center max-w-md w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
        <Search className="text-gray-400 mr-2 h-4 w-4 shrink-0" />
        <input
          type="text"
          placeholder="Search bookings, invoices, customers..."
          className="bg-transparent text-sm w-full focus:outline-none text-gray-700"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications Dropdown Trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors relative cursor-pointer"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2">
              <div className="px-4 py-2 font-semibold border-b border-gray-100 text-sm text-gray-800">
                Notifications
              </div>
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                <div className="p-3 hover:bg-gray-50 transition-colors text-xs text-gray-600 cursor-pointer">
                  <p className="font-medium text-gray-800">New Booking</p>
                  <p className="mt-0.5">Amit K. booked Spa Treatment at 3:00 PM today.</p>
                </div>
                <div className="p-3 hover:bg-gray-50 transition-colors text-xs text-gray-600 cursor-pointer">
                  <p className="font-medium text-gray-800">Low Stock Alert</p>
                  <p className="mt-0.5">Shampoo inventory is below reorder level (5 remaining).</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              O
            </div>
            <span className="hidden md:inline text-sm font-medium text-gray-700">Owner</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-400">Signed in as</p>
                <p className="text-sm font-medium text-gray-800 truncate">owner@parlour.com</p>
              </div>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Profile & Settings
              </a>
              <button
                onClick={() => {
                  // Logout logic
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
