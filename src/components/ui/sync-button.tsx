"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  isSyncing: boolean;
  onSync: () => void;
  className?: string;
  label?: string;
}

export function SyncButton({
  isSyncing,
  onSync,
  className,
  label = "Refresh",
}: SyncButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onSync}
      disabled={isSyncing}
      className={cn(
        "flex items-center justify-center gap-1.5 cursor-pointer relative overflow-hidden transition-all duration-200 h-8",
        isSyncing && "bg-muted/55 text-muted-foreground",
        className
      )}
      title="Refresh list data"
    >
      <RefreshCw
        size={14}
        className={cn(
          "transition-transform duration-700 ease-in-out",
          isSyncing && "animate-spin"
        )}
      />
      <span>{isSyncing ? "Refreshing..." : label}</span>
    </Button>
  );
}

