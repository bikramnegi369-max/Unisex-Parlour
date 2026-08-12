import { format, formatDistanceToNow, parseISO } from "date-fns";

const DEFAULT_CURRENCY = "INR";
const DEFAULT_LOCALE = "en-IN";

/**
 * Formats a number as a currency string.
 *
 * Centralizes all currency formatting so that when business settings
 * are introduced, only this function needs to change.
 */
export function formatCurrency(
  amount: number,
  options?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {};

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Parses date inputs reliably.
 */
function toDate(date: string | Date | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === "number") return new Date(date);
  return parseISO(date);
}

/**
 * Formats a date into a clean string (e.g. "31 Jul 2026").
 */
export function formatDate(
  date: string | Date | number | null | undefined,
  formatStr: string = "dd MMM yyyy",
  fallback: string = "—"
): string {
  if (!date) return fallback;
  try {
    const d = toDate(date);
    return isNaN(d.getTime()) ? fallback : format(d, formatStr);
  } catch (_) {
    return fallback;
  }
}

/**
 * Formats a date with time details (e.g. "31 Jul 2026, 04:30 PM").
 */
export function formatDateTime(
  date: string | Date | number | null | undefined,
  formatStr: string = "dd MMM yyyy, hh:mm a",
  fallback: string = "—"
): string {
  return formatDate(date, formatStr, fallback);
}

/**
 * Formats a date as a relative time string (e.g. "3 hours ago", "in 2 days").
 */
export function formatRelativeTime(
  date: string | Date | number | null | undefined,
  fallback: string = "—"
): string {
  if (!date) return fallback;
  try {
    const d = toDate(date);
    if (isNaN(d.getTime())) return fallback;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (_) {
    return fallback;
  }
}

/**
 * Capitalizes the first letter of each word in a string.
 */
export function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

