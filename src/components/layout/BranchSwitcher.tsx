"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasOrgWideAccess } from "@/lib/permissions";
import { useBranches } from "@/features/branches/hooks/useBranches";

/**
 * BranchSwitcher
 *
 * Global branch selection dropdown rendered in the Header.
 * - Shows only branches the current user is authorized to access.
 * - Shows "All Branches" option only for users with org-wide access (Owner).
 * - Persists selection to localStorage via useBranchContext.
 */
export default function BranchSwitcher() {
  const { user } = useAuth();
  const { branches, isLoading } = useBranches();
  const { currentBranch, isAllBranchesSelected, selectBranch } = useBranchContext();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canViewAllBranches = hasOrgWideAccess(user);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter: Owners see all branches, other roles only see active ones
  const accessibleBranches = branches.filter((b) => b.isActive || canViewAllBranches);

  const displayLabel = isAllBranchesSelected
    ? "All Branches"
    : currentBranch?.name ?? "Select Branch";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border/60 bg-muted/40 animate-pulse w-40">
        <Building2 size={14} className="text-muted-foreground shrink-0" />
        <div className="h-3 w-24 rounded bg-muted-foreground/20" />
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer",
          "bg-background hover:bg-muted border-border/60 hover:border-border",
          "text-foreground min-w-[140px] max-w-[200px]"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isAllBranchesSelected ? (
          <Layers size={14} className="text-primary shrink-0" />
        ) : (
          <Building2 size={14} className="text-primary shrink-0" />
        )}
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground shrink-0 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>
 
      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1.5 min-w-[200px] bg-popover border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
        >
          {/* All Branches option — only for org-wide users */}
          {canViewAllBranches && (
            <button
              role="option"
              aria-selected={isAllBranchesSelected}
              onClick={() => {
                selectBranch(null);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer",
                isAllBranchesSelected
                  ? "bg-primary/5 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Layers size={14} className="shrink-0" />
              <span className="flex-1">All Branches</span>
              {isAllBranchesSelected && <Check size={13} className="text-primary" />}
            </button>
          )}
 
          {/* Divider between "All Branches" and specific branch list */}
          {canViewAllBranches && accessibleBranches.length > 0 && (
            <div className="my-1 border-t border-border/50" />
          )}
 
          {/* Individual branch options */}
          {accessibleBranches.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No branches available
            </div>
          ) : (
            accessibleBranches.map((branch) => {
              const isSelected = currentBranch?.id === branch.id;
              const isActive = branch.isActive;
              return (
                <button
                  key={branch.id}
                  role="option"
                  aria-selected={isSelected}
                  disabled={!isActive}
                  onClick={() => {
                    selectBranch(branch.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-colors",
                    !isActive
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : isSelected
                      ? "bg-primary/5 text-primary font-medium cursor-pointer"
                      : "text-foreground hover:bg-muted cursor-pointer"
                  )}
                >
                  <Building2 size={14} className="shrink-0" />
                  <span className="flex-1 truncate">{branch.name}</span>
                  {!isActive && (
                    <span className="text-[10px] font-semibold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Inactive
                    </span>
                  )}
                  {isSelected && <Check size={13} className="text-primary" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
