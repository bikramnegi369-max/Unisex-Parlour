import React, { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Scissors,
  User,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/features/appointments/types/appointment.types";

interface ReadyToBillQueueProps {
  appointments: Appointment[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onCheckout: (appointment: Appointment) => void;
}

type QueueStatusFilter = "all" | "completed" | "in_progress";

export function ReadyToBillQueue({
  appointments,
  isLoading,
  isRefreshing = false,
  onCheckout,
}: ReadyToBillQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<QueueStatusFilter>("all");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Separate counts for fast status chips
  const counts = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    for (const apt of appointments) {
      if (apt.status === "completed") completedCount++;
      else if (apt.status === "in_progress") inProgressCount++;
    }
    return {
      all: appointments.length,
      completed: completedCount,
      in_progress: inProgressCount,
    };
  }, [appointments]);

  // 2. Sort completed (ready to pay) first, then filter by status and search query
  const filteredAppointments = useMemo(() => {
    return appointments
      .slice()
      .sort((a, b) => {
        // Prioritize completed (waiting at counter) over in_progress
        if (a.status === "completed" && b.status !== "completed") return -1;
        if (a.status !== "completed" && b.status === "completed") return 1;
        // Secondary sort: most recent appointments first
        return (b.startTime || "").localeCompare(a.startTime || "");
      })
      .filter((apt) => {
        // Status filter
        if (statusFilter !== "all" && apt.status !== statusFilter) {
          return false;
        }

        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const custName = (apt.customer?.name || "").toLowerCase();
          const custPhone = (apt.customer?.phone || "").toLowerCase();
          const services = (apt.services || [])
            .map((s) => s.name.toLowerCase())
            .join(" ");

          return (
            custName.includes(q) ||
            custPhone.includes(q) ||
            services.includes(q)
          );
        }

        return true;
      });
  }, [appointments, statusFilter, searchTerm]);

  // If loading initially with no data, show the full skeleton
  if (isLoading && appointments.length === 0) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2 animate-pulse"
            >
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-6 w-full bg-muted rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (appointments.length === 0 && !isLoading && !isRefreshing) {
    return null;
  }

  // If list is empty but currently refreshing (e.g. after manual sync)
  if (appointments.length === 0 && (isLoading || isRefreshing)) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-44 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 bg-muted/30 border border-border/60 rounded-lg space-y-2 animate-pulse"
            >
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-6 w-full bg-muted rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-linear-to-r from-primary/5 via-card to-card border border-primary/20 rounded-xl p-4 space-y-3 shadow-2xs transition-opacity duration-200 ${
        isRefreshing ? "opacity-75" : "opacity-100"
      }`}
    >
      {/* Header with Title & Collapse Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-primary ${
                isRefreshing ? "animate-spin" : "animate-ping opacity-75"
              }`}
            ></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            POS Checkout Queue ({appointments.length} Ready for Billing)
          </h2>
          {isRefreshing && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
              Syncing queue...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Finished & In-chair visits ready for checkout
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
            title={isCollapsed ? "Expand queue" : "Collapse queue"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Queue Filter Controls: Status Chips & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                  statusFilter === "completed"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                }`}
              >
                Ready to Pay ({counts.completed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("in_progress")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                  statusFilter === "in_progress"
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                }`}
              >
                In Chair ({counts.in_progress})
              </button>
            </div>

            {/* Instant In-Queue Search */}
            <div className="relative sm:w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Find in queue (name, phone)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-7 text-xs bg-background/80"
              />
            </div>
          </div>

          {/* Card Grid with Bounded Max-Height to Prevent Page Bloat */}
          {filteredAppointments.length === 0 ? (
            <div className="p-4 bg-muted/20 border border-border/60 rounded-xl text-center text-xs text-muted-foreground">
              No queue tickets match &ldquo;{searchTerm}&rdquo; in this status.
            </div>
          ) : (
            <div className="max-h-95 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAppointments.map((apt) => {
                  const serviceNames = (apt.services || [])
                    .map((s) => s.name)
                    .join(", ");
                  const grossSubtotal = (apt.services || []).reduce(
                    (sum, s) => sum + (s.price || 0),
                    0,
                  );
                  const subCoveredAmount = (apt.services || []).reduce(
                    (sum, s) =>
                      sum +
                      (s.appliedSubscriptionId || s.isRedeemedViaSubscription
                        ? s.price || 0
                        : 0),
                    0,
                  );
                  const estPayable = Math.max(0, grossSubtotal - subCoveredAmount);
                  const hasSubscription = subCoveredAmount > 0;
                  const isFinished = apt.status === "completed";

                  return (
                    <div
                      key={apt.id}
                      className={`bg-card border rounded-xl p-3 flex flex-col justify-between space-y-2.5 transition-all hover:shadow-xs group ${
                        isFinished
                          ? "border-emerald-500/30 shadow-emerald-500/5 hover:border-emerald-500/60"
                          : "border-border/80 hover:border-primary/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground flex items-center gap-1 truncate">
                            <User className="h-3 w-3 text-primary shrink-0" />
                            {apt.customer?.name || "Walk-in Guest"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              isFinished
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {isFinished ? "Ready to Pay" : "In Chair"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{apt.customer?.phone || "No phone"}</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />
                            {apt.startTime || formatDate(apt.date, "hh:mm a")}
                          </span>
                        </div>

                        <p
                          className="text-[11px] text-muted-foreground truncate font-medium flex items-center gap-1 pt-0.5"
                          title={serviceNames}
                        >
                          <Scissors className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {serviceNames || "Salon Services"}
                        </p>

                        {hasSubscription && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                            <ShieldCheck className="h-3 w-3" />
                            <span>
                              Subscription: -{formatCurrency(subCoveredAmount)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">
                            Est. Payable
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-black text-foreground">
                              {formatCurrency(estPayable)}
                            </span>
                            {hasSubscription && (
                              <span className="text-[10px] text-muted-foreground line-through">
                                {formatCurrency(grossSubtotal)}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => onCheckout(apt)}
                          className={`h-7 text-xs font-bold gap-1 px-2.5 shadow-2xs group-hover:translate-x-0.5 transition-transform ${
                            isFinished
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
                          }`}
                        >
                          <span>Quick Bill</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
