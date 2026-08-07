"use client";

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { hasOrgWideAccess, hasBranchAccess } from "@/lib/permissions";
import { useBranches } from "@/features/branches/hooks/useBranches";

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

  // Filter: Expose only branches the current user is authorized to access
  const accessibleBranches = branches.filter((b) => hasBranchAccess(user, b.id));

  const displayLabel = isAllBranchesSelected
    ? (canViewAllBranches ? "All Branches" : "No accessible branches")
    : currentBranch?.name ?? "Select Branch";

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border/60 bg-muted/40 animate-pulse w-44">
        <Building2 size={14} className="text-muted-foreground shrink-0" />
        <div className="h-3 w-24 rounded bg-muted-foreground/20" />
      </div>
    );
  }

  return (
    <div className="relative select-none" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs",
          "bg-background hover:bg-muted/70 border-border/80 hover:border-border",
          "text-foreground min-w-[140px] max-w-[210px]"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {isAllBranchesSelected && canViewAllBranches ? (
          <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
            <Layers size={13} />
          </div>
        ) : (
          <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
            <Building2 size={13} />
          </div>
        )}
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground/70 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-2 min-w-[210px] w-full bg-popover border border-border rounded-2xl shadow-xl z-50 p-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 space-y-1"
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
                "flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer",
                isAllBranchesSelected
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Layers size={14} className="shrink-0 text-purple-500" />
              <span className="flex-1 truncate">All Branches</span>
              {isAllBranchesSelected && <Check size={14} className="text-primary shrink-0" />}
            </button>
          )}

          {canViewAllBranches && accessibleBranches.length > 0 && (
            <div className="my-1 border-t border-border/50" />
          )}

          {/* Individual branch options */}
          {accessibleBranches.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No branches available
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {accessibleBranches.map((branch) => {
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
                      "flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs rounded-xl transition-colors",
                      !isActive
                        ? "opacity-50 cursor-not-allowed text-muted-foreground"
                        : isSelected
                        ? "bg-primary/10 text-primary font-bold cursor-pointer"
                        : "text-foreground hover:bg-muted cursor-pointer font-medium"
                    )}
                  >
                    <Building2 size={14} className="shrink-0 text-muted-foreground/70" />
                    <span className="flex-1 truncate">{branch.name}</span>
                    {!isActive && (
                      <span className="text-[9px] font-bold bg-destructive/10 text-destructive px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Inactive
                      </span>
                    )}
                    {isSelected && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
