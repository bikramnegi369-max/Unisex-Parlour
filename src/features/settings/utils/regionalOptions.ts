const FALLBACK_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

const FALLBACK_CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SGD",
  "AUD",
  "CAD",
];

export const LOCALE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "en-IN", label: "English (India) — en-IN" },
  { value: "en-US", label: "English (US) — en-US" },
  { value: "en-GB", label: "English (UK) — en-GB" },
  { value: "en-AE", label: "English (UAE) — en-AE" },
  { value: "ar-AE", label: "Arabic (UAE) — ar-AE" },
  { value: "en-SG", label: "English (Singapore) — en-SG" },
  { value: "en-AU", label: "English (Australia) — en-AU" },
  { value: "en-CA", label: "English (Canada) — en-CA" },
];

export function getTimezoneOptions(currentValue?: string | null): string[] {
  let zones: string[] = FALLBACK_TIMEZONES;
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    if (typeof intl.supportedValuesOf === "function") {
      const supported = intl.supportedValuesOf("timeZone");
      if (supported.length > 0) zones = supported;
    }
  } catch {
    zones = FALLBACK_TIMEZONES;
  }
  if (currentValue && !zones.includes(currentValue)) {
    return [currentValue, ...zones];
  }
  return zones;
}

export function getCurrencyOptions(currentValue?: string | null): string[] {
  let currencies: string[] = FALLBACK_CURRENCIES;
  try {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    if (typeof intl.supportedValuesOf === "function") {
      const supported = intl.supportedValuesOf("currency");
      if (supported.length > 0) currencies = supported;
    }
  } catch {
    currencies = FALLBACK_CURRENCIES;
  }
  if (currentValue && !currencies.includes(currentValue)) {
    return [currentValue, ...currencies];
  }
  return currencies;
}
