import { useState, useEffect, useRef } from "react";

export interface UseDebounceOptions {
  /**
   * If true (default), when a string becomes empty or whitespace-only,
   * the debounced value updates immediately (0ms delay) to avoid laggy clearing.
   */
  immediateOnEmpty?: boolean;
  /**
   * Minimum delay (in ms) to apply when deleting characters (shortening text).
   * Prevents premature intermediate API calls caused by the OS key-repeat pause (~400-500ms).
   * Default is 500ms.
   */
  deletionDelay?: number;
}

/**
 * Production-grade custom hook to debounce a value.
 *
 * Solves the OS key-repeat delay problem:
 * When holding down Backspace, the OS pauses for ~400ms before streaming rapid key repeats.
 * A naive 300-350ms debounce fires mid-backspace on the first deleted character (e.g. "kus").
 * This hook:
 * 1. Instantly resets (0ms) when cleared to "" so clear actions feel instant.
 * 2. Applies an extended deletion buffer (default 500ms) when text is shortening,
 *    preventing the OS typematic pause from triggering an unwanted intermediate query.
 */
export function useDebounce<T>(
  value: T,
  delay: number = 300,
  options: UseDebounceOptions = {}
): T {
  const { immediateOnEmpty = true, deletionDelay = 500 } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [prevValue, setPrevValue] = useState<T>(value);
  const prevValueRef = useRef<T>(value);

  const isString = typeof value === "string";
  const isEmptyString = isString && (value as string).trim() === "";

  // Adjust state during render if value changed and matches immediate condition (React standard pattern)
  if (value !== prevValue) {
    setPrevValue(value);
    if (immediateOnEmpty && isEmptyString) {
      setDebouncedValue(value);
    }
  }

  useEffect(() => {
    // If already updated immediately during render, skip timer
    if (immediateOnEmpty && isEmptyString) {
      prevValueRef.current = value;
      return;
    }

    // Compute effective delay
    // If the string length decreased, the user is backspacing/deleting.
    // Use Math.max(delay, deletionDelay) to safely bridge the OS typematic repeat gap.
    let effectiveDelay = delay;
    if (isString && typeof prevValueRef.current === "string") {
      const isDeleting = (value as string).length < (prevValueRef.current as string).length;
      if (isDeleting) {
        effectiveDelay = Math.max(delay, deletionDelay);
      }
    }

    prevValueRef.current = value;

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, effectiveDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, immediateOnEmpty, deletionDelay, isEmptyString, isString]);

  return debouncedValue;
}

