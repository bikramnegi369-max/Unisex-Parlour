"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchUsers } from "@/features/users/api/users.api";
import type { UserSummary } from "@/features/users/types/users.types";
import {
  Loader2,
  Search,
  UserRound,
  X,
  Mail,
  Phone,
  CheckCircle2,
  Building2,
  UserCheck,
  UserX,
} from "lucide-react";

interface UserSelectorProps {
  initialUser?: UserSummary | null;
  onSelect: (user: UserSummary) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function UserSelector({
  initialUser = null,
  onSelect,
  onClear,
  label = "Linked User",
  placeholder = "Search by name, email, phone, or username...",
  disabled = false,
}: UserSelectorProps) {
  const [query, setQuery] = useState(initialUser?.name || "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(initialUser ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery || selectedUser) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const runSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await searchUsers({ search: debouncedQuery, page: 1, limit: 8 });
        if (isActive) {
          setResults((response?.data || []) as UserSummary[]);
          setIsOpen(true);
        }
      } catch {
        if (isActive) {
          setError("Unable to load users right now. Please try again.");
          setResults([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    runSearch();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, selectedUser]);

  const displayResults = useMemo(() => results.filter(Boolean), [results]);

  const handleSelect = (user: UserSummary) => {
    setSelectedUser(user);
    setQuery(user.name || "");
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelect(user);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onClear?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || displayResults.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % displayResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + displayResults.length) % displayResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = displayResults[highlightedIndex >= 0 ? highlightedIndex : 0];
      if (target) {
        handleSelect(target);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join("");
  };

  return (
    <div className="space-y-3">
      <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        {label}
      </label>

      {selectedUser ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4 shadow-sm transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base shadow-inner">
                {getInitials(selectedUser.name)}
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground text-sm truncate">{selectedUser.name}</p>
                  {selectedUser.username && (
                    <span className="text-xs text-muted-foreground font-mono">@{selectedUser.username}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                  {selectedUser.email && (
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      {selectedUser.email}
                    </span>
                  )}
                  {selectedUser.phone && (
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      {selectedUser.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <Badge variant={selectedUser.status === "active" ? "success" : "muted"} className="capitalize">
                {selectedUser.status || "active"}
              </Badge>
              {selectedUser.isVerified && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30 dark:text-blue-400 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  Verified
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold"
              onClick={() => {
                setSelectedUser(null);
                setQuery("");
                setResults([]);
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              disabled={disabled}
            >
              <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              Change Selection
            </Button>
            {onClear && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClear}
                disabled={disabled}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Unlink Account
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => {
                if (query.trim()) {
                  setIsOpen(true);
                }
              }}
              onBlur={() => {
                window.setTimeout(() => setIsOpen(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={label}
              aria-expanded={isOpen}
              aria-controls="user-selector-listbox"
              disabled={disabled}
              className="pl-9 pr-9 text-xs h-10 shadow-sm"
            />
            {query.trim() && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isLoading && (
              <div className="absolute right-3 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>

          {isOpen && (
            <div
              id="user-selector-listbox"
              className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching user directory...
                </div>
              ) : error ? (
                <div className="p-4 text-xs text-destructive text-center">{error}</div>
              ) : displayResults.length === 0 && debouncedQuery ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-1">
                  <UserX className="h-8 w-8 stroke-[1.5] text-muted-foreground/50 mb-1" />
                  <p className="text-xs font-semibold text-foreground">No matching users found</p>
                  <p className="text-[11px]">No user profiles matched &quot;{debouncedQuery}&quot;.</p>
                </div>
              ) : !debouncedQuery ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Type a name, username, email, or phone number to search.
                </div>
              ) : null}

              {displayResults.length > 0 && (
                <div className="max-h-72 overflow-y-auto divide-y divide-border/40 p-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 bg-muted/30 rounded-t-lg flex items-center justify-between">
                    <span>Matching Users</span>
                    <span>{displayResults.length} found</span>
                  </div>

                  {displayResults.map((user, index) => {
                    const isSelected = highlightedIndex === index;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`flex w-full items-start gap-3 p-3 text-left transition-colors rounded-lg ${
                          isSelected
                            ? "bg-primary/10 text-foreground ring-1 ring-primary/30"
                            : "hover:bg-muted/70 text-foreground"
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(user)}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {getInitials(user.name)}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-foreground truncate">{user.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge
                                variant={user.status === "active" ? "success" : "muted"}
                                className="text-[9px] px-1.5 py-0 capitalize"
                              >
                                {user.status || "active"}
                              </Badge>
                              {user.hasOrgWideAccess && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 border-purple-500/30 text-purple-600 bg-purple-50/50 dark:bg-purple-950/30 dark:text-purple-400 gap-0.5"
                                >
                                  <Building2 className="h-2.5 w-2.5" />
                                  Org-wide
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            {user.email && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span className="truncate">{user.email}</span>
                              </span>
                            )}
                            {user.phone && (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                <span>{user.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
