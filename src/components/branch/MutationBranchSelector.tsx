"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Building2, Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimpleBranch {
  id: string;
  name: string;
  isActive: boolean;
}

interface MutationBranchSelectorProps {
  value: string;
  onChange: (value: string) => void;
  branches: SimpleBranch[];
  disabled?: boolean;
  error?: string;
}

export function MutationBranchSelector({
  value,
  onChange,
  branches,
  disabled = false,
  error,
}: MutationBranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === value);
  }, [branches, value]);

  const filteredBranches = useMemo(() => {
    const active = branches.filter((b) => b.isActive);
    if (!searchTerm.trim()) return active;
    const lower = searchTerm.toLowerCase();
    return active.filter((b) => b.name.toLowerCase().includes(lower));
  }, [branches, searchTerm]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (branchId: string) => {
    onChange(branchId);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => 
          prev < filteredBranches.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredBranches.length) {
        handleSelect(filteredBranches[highlightedIndex].id);
      } else if (!isOpen) {
        setIsOpen(true);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const showSearch = branches.length > 5;

  return (
    <div className="space-y-1.5 text-left" ref={containerRef}>
      <label htmlFor="mutation-branch-trigger" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Branch <span className="text-destructive">*</span>
      </label>

      <div className="relative">
        {/* Trigger Button */}
        <button
          id="mutation-branch-trigger"
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => {
            if (prev) {
              setSearchTerm("");
              setHighlightedIndex(-1);
            }
            return !prev;
          })}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive focus:ring-destructive" : "border-input"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 size={15} className="text-muted-foreground shrink-0" />
            {selectedBranch ? (
              <span className="text-foreground font-medium">{selectedBranch.name}</span>
            ) : (
              <span className="text-muted-foreground">Select branch</span>
            )}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-muted-foreground/70 shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute top-full left-0 z-50 mt-1.5 max-h-60 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl animate-in fade-in-50 slide-in-from-top-1 duration-150 flex flex-col"
          >
            {/* Search Input */}
            {showSearch && (
              <div className="relative border-b border-border p-2">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search branch name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  className="h-8 w-full rounded-lg bg-muted/50 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {/* Branch List */}
            <div className="overflow-y-auto p-1 max-h-48">
              {filteredBranches.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground font-medium">
                  No branches found
                </div>
              ) : (
                filteredBranches.map((branch, index) => {
                  const isSelected = branch.id === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={branch.id}
                      role="option"
                      type="button"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(branch.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : isHighlighted
                          ? "bg-muted text-foreground"
                          : "text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Building2 size={13} className="shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{branch.name}</span>
                      {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground font-semibold">
        This note will be recorded for the selected branch.
      </p>

      {error && (
        <p className="text-xs text-destructive font-medium mt-1">{error}</p>
      )}
    </div>
  );
}
