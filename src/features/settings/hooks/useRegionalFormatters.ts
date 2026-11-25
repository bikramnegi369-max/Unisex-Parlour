"use client";

import { useEffect, useMemo } from "react";
import { useBranchContext } from "@/hooks/useBranchContext";
import { useEffectiveSettings } from "./useSettings";
import {
  formatCurrency as baseFormatCurrency,
  setRegionalDefaults,
} from "@/lib/formatters";

/**
 * Provides regional formatting helpers backed by EffectiveSettings
 * (Branch override > Organization default > System default).
 */
export function useRegionalFormatters() {
  const { currentBranchId } = useBranchContext();
  const { data: effective } = useEffectiveSettings(
    currentBranchId ?? null,
    Boolean(currentBranchId),
  );

  const timezone = effective?.regional?.timezone?.value ?? "Asia/Kolkata";
  const currency = effective?.regional?.currency?.value ?? "INR";
  const locale = effective?.regional?.locale?.value ?? "en-IN";
  const dateFormat = effective?.regional?.dateFormat?.value ?? "YYYY-MM-DD";
  const timeFormat = effective?.regional?.timeFormat?.value ?? "HH:mm";
  const firstDayOfWeek = effective?.regional?.firstDayOfWeek?.value ?? 1;

  useEffect(() => {
    setRegionalDefaults({ currency, locale });
  }, [currency, locale]);

  return useMemo(() => {
    const formatCurrency = (amount: number | string | null | undefined) => {
      try {
        return baseFormatCurrency(Number(amount ?? 0), { currency, locale });
      } catch {
        return baseFormatCurrency(Number(amount ?? 0), {
          currency: "INR",
          locale: "en-IN",
        });
      }
    };

    const formatDate = (value: Date | string | number) => {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      try {
        return new Intl.DateTimeFormat(locale, {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
      } catch {
        return d.toISOString().slice(0, 10);
      }
    };

    const formatTime = (value: Date | string | number) => {
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      try {
        return new Intl.DateTimeFormat(locale, {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: timeFormat === "hh:mm A",
        }).format(d);
      } catch {
        return d.toISOString().slice(11, 16);
      }
    };

    return {
      timezone,
      currency,
      locale,
      dateFormat,
      timeFormat,
      firstDayOfWeek,
      formatCurrency,
      formatDate,
      formatTime,
    };
  }, [timezone, currency, locale, dateFormat, timeFormat, firstDayOfWeek]);
}
