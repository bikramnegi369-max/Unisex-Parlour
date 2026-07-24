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
    <nav className="flex items-center space-x-1.5 text-xs text-gray-500 font-medium mb-4 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
        <Home size={13} />
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
            <ChevronRight size={12} className="text-gray-400" />
            {isLast ? (
              <span className="text-gray-900 font-semibold">{formattedName}</span>
            ) : (
              <Link href={href} className="hover:text-indigo-600 transition-colors">
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
