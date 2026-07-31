const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "en-US";

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
