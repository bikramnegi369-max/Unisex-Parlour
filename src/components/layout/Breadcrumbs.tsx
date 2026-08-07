"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import React from "react";

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/dashboard") return null;

  const paths = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-muted-foreground font-medium mb-4 shrink-0 select-none flex-wrap gap-y-1">
      <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-primary transition-colors py-0.5 px-1.5 rounded-md hover:bg-muted/50">
        <Home size={13} className="text-muted-foreground/80" />
        <span>Home</span>
      </Link>
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const formattedName = path
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return (
          <React.Fragment key={path}>
            <ChevronRight size={12} className="text-muted-foreground/40 shrink-0" />
            {isLast ? (
              <span className="text-foreground font-bold py-0.5 px-1.5 rounded-md bg-muted/40">{formattedName}</span>
            ) : (
              <Link href={href} className="hover:text-primary transition-colors py-0.5 px-1.5 rounded-md hover:bg-muted/50">
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
