"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderBannerProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeaderBanner({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderBannerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 border-l-4 border-l-primary bg-gradient-to-r from-primary/[0.08] via-primary/[0.01] to-card p-6 md:p-8 shadow-sm transition-all duration-300 hover:shadow-md dark:from-primary/[0.15] dark:via-card/40 dark:to-card/20",
        className
      )}
    >
      {/* Decorative ambient glows for a premium feel */}
      <div className="absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 size-48 rounded-full bg-primary/[0.05] blur-3xl pointer-events-none" />

      {/* Watermarked Icon */}
      {Icon && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-[0.03] text-primary pointer-events-none hidden lg:block">
          <Icon className="size-36" strokeWidth={1} />
        </div>
      )}

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            {title}
          </h1>
          {description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls Cluster */}
        {actions && (
          <div className="flex flex-col items-stretch sm:items-end gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>

  );
}
