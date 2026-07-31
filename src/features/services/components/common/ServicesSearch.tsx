"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SERVICES_CONFIG } from "../../config/services.config";

interface ServicesSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ServicesSearch({ value, onChange, placeholder }: ServicesSearchProps) {
  return (
    <div className="relative w-full md:max-w-md">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || SERVICES_CONFIG.labels.service.searchPlaceholder}
        className="pl-10"
      />
    </div>
  );
}
