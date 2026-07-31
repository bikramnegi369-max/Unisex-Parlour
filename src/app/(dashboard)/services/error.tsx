"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Route error boundary caught error:", error);
  }, [error]);

  return (
    <div className="flex-1 py-12">
      <ErrorState
        title="Something went wrong!"
        description={error.message || "An unexpected error occurred while loading the services catalogue details."}
        retryAction={{
          label: "Try Again",
          onClick: reset,
        }}
      />
    </div>
  );
}
