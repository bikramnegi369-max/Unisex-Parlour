"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className:
          "border border-border bg-popover text-popover-foreground shadow-lg rounded-xl text-sm font-medium",
        style: {
          fontFamily: "var(--font-poppins), sans-serif",
        },
      }}
      richColors
      closeButton
      duration={4000}
    />
  );
}
