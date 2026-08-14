import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Plus, Check, User, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCustomers } from "../hooks/useCustomers";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBranchContext } from "@/hooks/useBranchContext";
import { hasPermission } from "@/lib/permissions";
import { useDebounce } from "@/hooks/useDebounce";
import { QuickCustomerDialog } from "./QuickCustomerDialog";
import type { Customer } from "../types/customer.types";

export interface CustomerSelectorProps {
  value: string; // customerId
  onChange: (customerId: string, customer?: Customer) => void;
  error?: string;
  disabled?: boolean;
}

export function CustomerSelector({
  value,
  onChange,
  error,
  disabled = false,
}: CustomerSelectorProps) {
  const { user } = useAuth();
  const { isAllBranchesSelected, currentBranchId } = useBranchContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [manuallySelectedCustomer, setManuallySelectedCustomer] = useState<Customer | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const canCreateCustomer = hasPermission(user, "customers.create");
  const isBranchExplicit = !isAllBranchesSelected && currentBranchId !== null && currentBranchId !== "all";

  // Query customers with debounced search term
  const { data: customersData, isLoading } = useCustomers(
    debouncedSearch.trim() ? { search: debouncedSearch.trim() } : { limit: 20 }
  );

  const customers = useMemo(
    () => customersData?.data || [],
    [customersData?.data]
  );

  // Derived selected customer to avoid setState in effect
  const selectedCustomer = useMemo(() => {
    if (!value) return null;
    if (
      manuallySelectedCustomer &&
      (manuallySelectedCustomer.id === value || manuallySelectedCustomer._id === value)
    ) {
      return manuallySelectedCustomer;
    }
    return customers.find((c) => c.id === value || c._id === value) || null;
  }, [value, customers, manuallySelectedCustomer]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    const canonicalId = customer.id || customer._id || "";
    setManuallySelectedCustomer(customer);
    onChange(canonicalId, customer);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setManuallySelectedCustomer(null);
    onChange("", undefined);
    setSearchTerm("");
  };

  const handleQuickCreateSuccess = (newCustomer: Customer) => {
    const canonicalId = newCustomer.id || newCustomer._id || "";
    setManuallySelectedCustomer(newCustomer);
    onChange(canonicalId, newCustomer);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="space-y-1 relative" ref={dropdownRef}>
      {/* Selected Customer View */}
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-2 rounded-lg border border-primary/40 bg-primary/5 text-xs">
          <div className="flex items-center gap-2 truncate">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-foreground block truncate">
                {selectedCustomer.name}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">
                {selectedCustomer.phone}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer shrink-0"
          >
            Change
          </Button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search customer name or phone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="h-9 text-xs pl-8 pr-8"
          />
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 absolute right-2.5 top-2.5 text-muted-foreground animate-spin" />
          )}
        </div>
      )}

      {error && (
        <span className="text-[11px] text-destructive block">{error}</span>
      )}

      {/* Dropdown Menu */}
      {!selectedCustomer && isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 duration-100 p-1">
          {isLoading ? (
            <div className="p-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Searching customers...
            </div>
          ) : customers.length > 0 ? (
            <div className="space-y-0.5">
              {customers.map((c) => (
                <button
                  key={c.id || c._id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-foreground">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {c.phone} {c.email ? `• ${c.email}` : ""}
                    </div>
                  </div>
                  {(c.id === value || c._id === value) && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              ))}

              {/* Inline Create Option in Search Results */}
              {canCreateCustomer && (
                <div className="pt-1 mt-1 border-t border-border">
                  {isBranchExplicit ? (
                    <button
                      type="button"
                      onClick={() => setIsQuickCreateOpen(true)}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-primary/10 text-primary font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create New Customer
                    </button>
                  ) : (
                    <div className="p-2 text-[11px] text-muted-foreground bg-muted/30 rounded flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Select a branch before creating a new customer.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty Search Results */
            <div className="p-3 text-center space-y-2">
              <div className="text-xs text-muted-foreground font-medium">
                No customer found
              </div>

              {canCreateCustomer ? (
                isBranchExplicit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickCreateOpen(true)}
                    className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create New Customer
                  </Button>
                ) : (
                  <div className="p-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded flex items-center justify-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Select a branch before creating a new customer.</span>
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Quick Customer Dialog */}
      <QuickCustomerDialog
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onSuccess={handleQuickCreateSuccess}
      />
    </div>
  );
}
