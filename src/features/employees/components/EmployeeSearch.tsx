"use client";

import React, { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmployeeSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function EmployeeSearch({ value, onChange, placeholder, isLoading }: EmployeeSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when user presses the '/' shortcut key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative w-full md:max-w-md select-none group">
      <Search 
        size={15} 
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" 
      />
      
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search employees by name or email..."}
        className="pl-9 pr-10 h-9 text-xs rounded-lg transition-all"
      />

      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        ) : value ? (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="cursor-pointer hover:bg-muted p-0.5 rounded transition-colors text-muted-foreground hover:text-foreground"
            title="Clear search query"
            aria-label="Clear search query"
          >
            <X size={13} />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/80 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
