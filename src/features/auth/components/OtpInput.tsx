"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  isInvalid?: boolean;
}

export function OtpInput({
  value = "",
  onChange,
  onComplete,
  disabled = false,
  isInvalid = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Array representation of 6 digits
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || "");

  useEffect(() => {
    // Focus the first input on initial mount if empty
    if (!disabled && value.length === 0 && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled, value.length]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digit = inputValue.replace(/\D/g, "").slice(-1); // Take only last typed digit

    const newDigits = [...digits];
    newDigits[index] = digit;
    const newOtp = newDigits.join("");

    onChange(newOtp);

    // Auto-focus next input if digit entered
    if (digit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.length === 6 && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Backspace on empty input -> focus previous
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData("text").trim();
    const numericPaste = pastedData.replace(/\D/g, "").slice(0, 6);

    if (numericPaste) {
      onChange(numericPaste);
      const focusIndex = Math.min(numericPaste.length, 5);
      inputRefs.current[focusIndex]?.focus();

      if (numericPaste.length === 6 && onComplete) {
        onComplete(numericPaste);
      }
    }
  };

  return (
    <div
      role="group"
      aria-label="6-digit Verification Code"
      className="flex items-center justify-center gap-2 sm:gap-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1} of 6`}
          aria-invalid={isInvalid}
          className={cn(
            "h-12 w-11 sm:h-14 sm:w-12 text-center text-xl font-bold rounded-xl border bg-background/50 text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none",
            isInvalid
              ? "border-destructive focus:ring-destructive focus:border-destructive text-destructive"
              : "border-border/80 dark:border-white/10 hover:border-primary/50"
          )}
        />
      ))}
    </div>
  );
}
