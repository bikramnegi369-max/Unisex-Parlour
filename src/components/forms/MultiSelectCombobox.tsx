"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Check, X, ChevronDown, Search, Loader2 } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectComboboxProps {
  id?: string;
  label: string;
  options: ComboboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  maxDropdownHeight?: number;
}

export function MultiSelectCombobox({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder = "Search...",
  isLoading = false,
  disabled = false,
  maxDropdownHeight = 240,
}: MultiSelectComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? `multi-select-${generatedId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const selectedSet = new Set(selected);

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function remove(value: string) {
    onChange(selected.filter((v) => v !== value));
  }

  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>

      {/* Trigger pill-box */}
      <div
        className={[
          "flex flex-wrap gap-1.5 min-h-10 px-3 py-2 rounded-lg border bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "transition-colors cursor-text",
          disabled
            ? "opacity-50 cursor-not-allowed border-input"
            : "border-input hover:border-ring/50",
        ].join(" ")}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full border border-primary/20 shrink-0"
          >
            {opt.label}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(opt.value);
                }}
                className="text-primary/60 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 -mr-0.5"
                aria-label={`Remove ${opt.label}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          disabled={disabled}
          placeholder={selectedOptions.length === 0 ? placeholder : ""}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-w-32 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOpen) inputRef.current?.focus();
            setIsOpen((prev) => !prev);
          }}
          className="ml-auto text-muted-foreground hover:text-foreground disabled:cursor-not-allowed shrink-0 self-center"
          aria-label="Toggle dropdown"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="relative z-50 w-full" style={{ marginTop: "-2px" }}>
          <div
            className="absolute top-0 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
            style={{ maxHeight: maxDropdownHeight }}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/10">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div
              className="overflow-y-auto"
              style={{ maxHeight: maxDropdownHeight - 40 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading options...
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No matches found
                </p>
              ) : (
                <ul className="py-1">
                  {filtered.map((opt) => {
                    const isSelected = selectedSet.has(opt.value);
                    return (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => toggle(opt.value)}
                          className={[
                            "flex items-center w-full text-left px-3 py-2 text-sm gap-3 transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected ? "bg-primary/5" : "",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input bg-background",
                            ].join(" ")}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium truncate">
                              {opt.label}
                            </span>
                            {opt.sublabel && (
                              <span className="block text-xs text-muted-foreground truncate">
                                {opt.sublabel}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
