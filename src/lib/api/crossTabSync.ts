"use client";

import { useEffect } from "react";
import { queryClient } from "@/lib/api/queryClient";

const CHANNEL_NAME = "unisex_parlour_cross_tab_sync";

export type CrossTabSyncScope =
  | "appointments"
  | "invoices"
  | "customers"
  | "services"
  | "employees"
  | "subscriptions"
  | "all";

interface CrossTabMessage {
  type: "INVALIDATE_QUERIES";
  scope: CrossTabSyncScope;
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

  // 1. Try modern BroadcastChannel API
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(msg);
      return;
    } catch {
      // Fallback to storage event below
    }
  }

  // 2. Reliable fallback for older engines: localStorage key mutation
  try {
    localStorage.setItem(CHANNEL_NAME, JSON.stringify(msg));
  } catch {
    // Ignore storage quota / private browsing errors
  }
}

/**
 * Hook to listen for cross-tab invalidation signals and invalidate TanStack Query state.
 */
export function useCrossTabSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleInvalidate = (scope: CrossTabSyncScope) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          if (scope === "all") return true;
          if (scope === "appointments") {
            return key === "appointments" || key === "appointment";
          }
          if (scope === "invoices") {
            return key === "invoices" || key === "invoice" || key === "billing";
          }
          if (scope === "subscriptions") {
            return key === "subscriptions" || key === "subscription";
          }
          return key === scope;
        },
      });
    };

    // 1. Listen via BroadcastChannel
    const channel = getBroadcastChannel();
    const handleChannelMessage = (event: MessageEvent<CrossTabMessage>) => {
      if (event.data?.type === "INVALIDATE_QUERIES") {
        handleInvalidate(event.data.scope);
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
          if (data.type === "INVALIDATE_QUERIES") {
            handleInvalidate(data.scope);
          }
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
  }, []);
}
