"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Unauthorized() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Access Denied
      </h1>
      <p className="mt-3 text-base text-muted-foreground max-w-md">
        You do not have the required permissions to view this page. Please contact your system administrator if you believe this is an error.
      </p>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "default" }), "inline-flex items-center gap-2")}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
