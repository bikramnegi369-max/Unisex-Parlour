"use client";

import { useEffect } from "react";
import { queryClient } from "@/lib/api/queryClient";
import { useAppDispatch } from "@/hooks/store";
import { setCurrentBranch } from "@/store/slices/branchSlice";
import { setStoredBranchId } from "@/lib/branch/storage";

const CHANNEL_NAME = "unisex_parlour_cross_tab_sync";

export type CrossTabSyncScope =
  | "appointments"
  | "invoices"
  | "customers"
  | "services"
  | "employees"
  | "leaves"
  | "subscriptions"
  | "loyalty"
  | "branch"
  | "auth"
  | "all";

export interface CrossTabMessage {
  type: "INVALIDATE_QUERIES" | "BRANCH_CHANGED" | "AUTH_LOGOUT";
  scope?: CrossTabSyncScope;
  branchId?: string | null;
  timestamp: number;
}

let syncChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!syncChannel) {
    try {
      syncChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      syncChannel = null;
    }
  }
  return syncChannel;
}

/**
 * Broadcast an invalidation signal to all other open tabs in the same browser.
 */
export function broadcastCrossTabInvalidation(scope: CrossTabSyncScope = "appointments") {
  if (typeof window === "undefined") return;

  const msg: CrossTabMessage = {
    type: "INVALIDATE_QUERIES",
    scope,
    timestamp: Date.now(),
  };

  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(msg);
      return;
    } catch {
      // Fallback to storage event below
    }
  }

  try {
    localStorage.setItem(CHANNEL_NAME, JSON.stringify(msg));
  } catch {
    // Ignore storage quota / private browsing errors
  }
}

/**
 * Broadcast a branch switch signal to all other open tabs.
 */
export function broadcastBranchChanged(branchId: string | null) {
  if (typeof window === "undefined") return;

  const msg: CrossTabMessage = {
    type: "BRANCH_CHANGED",
    branchId,
    timestamp: Date.now(),
  };

  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(msg);
      return;
    } catch {
      // Fallback to storage event below
    }
  }

  try {
    localStorage.setItem(CHANNEL_NAME, JSON.stringify(msg));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Broadcast an auth logout signal so other tabs can clear session and redirect.
 */
export function broadcastAuthLogout() {
  if (typeof window === "undefined") return;

  const msg: CrossTabMessage = {
    type: "AUTH_LOGOUT",
    timestamp: Date.now(),
  };

  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(msg);
      return;
    } catch {
      // Fallback to storage event below
    }
  }

  try {
    localStorage.setItem(CHANNEL_NAME, JSON.stringify(msg));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Hook to listen for cross-tab invalidation signals and invalidate TanStack Query state.
 */
export function useCrossTabSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleInvalidate = (scope?: CrossTabSyncScope) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          if (!scope || scope === "all") return true;
          if (scope === "appointments") {
            return (
              key === "appointments" ||
              key === "appointment" ||
              key === "checkout-queue"
            );
          }
          if (scope === "invoices") {
            return (
              key === "invoices" ||
              key === "invoice" ||
              key === "billing" ||
              key === "checkout-queue"
            );
          }
          if (scope === "subscriptions") {
            return key === "subscriptions" || key === "subscription";
          }
          if (scope === "customers") {
            return (
              key === "customers" ||
              key === "customer" ||
              key === "customer-notes" ||
              key === "customer-activity"
            );
          }
          if (scope === "employees") {
            return key === "employees" || key === "employee";
          }
          if (scope === "leaves") {
            return key === "leaves" || key === "leave";
          }
          if (scope === "loyalty") {
            return key === "loyalty-ledger" || key === "loyalty";
          }
          if (scope === "services") {
            return (
              key === "services" ||
              key === "service" ||
              key === "service-categories" ||
              key === "service-category"
            );
          }
          return key === scope;
        },
      });
    };

    const handleMessage = (msg: CrossTabMessage) => {
      if (msg.type === "INVALIDATE_QUERIES") {
        handleInvalidate(msg.scope);
      } else if (msg.type === "BRANCH_CHANGED") {
        const nextBranchId = msg.branchId ?? null;
        dispatch(setCurrentBranch(nextBranchId));
        if (nextBranchId) {
          setStoredBranchId(nextBranchId);
        } else {
          setStoredBranchId("all");
        }
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0];
            return key !== "auth-user" && key !== "branches";
          },
        });
      } else if (msg.type === "AUTH_LOGOUT") {
        queryClient.clear();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    };

    // 1. Listen via BroadcastChannel
    const channel = getBroadcastChannel();
    const handleChannelMessage = (event: MessageEvent<CrossTabMessage>) => {
      if (event.data) {
        handleMessage(event.data);
      }
    };

    if (channel) {
      channel.addEventListener("message", handleChannelMessage);
    }

    // 2. Listen via storage event (works across tabs in all browsers)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === CHANNEL_NAME && event.newValue) {
        try {
          const data: CrossTabMessage = JSON.parse(event.newValue);
          handleMessage(data);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    return () => {
      if (channel) {
        channel.removeEventListener("message", handleChannelMessage);
      }
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [dispatch]);
}
