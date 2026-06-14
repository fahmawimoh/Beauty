"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatDiscountLabel,
  isBlockedDiscountKey,
  parseDiscountInput,
  sanitizeDiscountInput,
  validateDiscountValue,
  type DiscountType,
} from "@/lib/discount";

interface DiscountInputProps {
  discountType: DiscountType;
  value: number;
  subtotal: number;
  onChange: (value: number) => void;
  className?: string;
}

export function DiscountInput({ discountType, value, subtotal, onChange, className }: DiscountInputProps) {
  const t = useTranslations("pos");
  const [display, setDisplay] = useState(value > 0 ? String(value) : "");

  useEffect(() => {
    setDisplay(value > 0 ? String(value) : "");
  }, [value, discountType]);

  const validationError =
    display !== "" || value > 0 ? validateDiscountValue(discountType, value, subtotal) : null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isBlockedDiscountKey(e.key)) e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeDiscountInput(e.target.value);
    setDisplay(sanitized);
    onChange(parseDiscountInput(sanitized));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const sanitized = sanitizeDiscountInput(pasted);
    setDisplay(sanitized);
    onChange(parseDiscountInput(sanitized));
  };

  return (
    <div className={cn("flex-1 min-w-0", className)}>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn("text-end", validationError && "border-red-400 focus-visible:ring-red-400")}
        placeholder="0"
        aria-invalid={!!validationError}
        aria-describedby={validationError ? "discount-error" : undefined}
      />
      {validationError && (
        <p id="discount-error" className="mt-1 text-xs text-red-500 text-end" role="alert">
          {t(`discountErrors.${validationError}`)}
        </p>
      )}
    </div>
  );
}

export function DiscountFieldLabel({
  discountType,
  className,
}: {
  discountType: DiscountType;
  className?: string;
}) {
  const t = useTranslations("pos");
  return (
    <span className={cn("text-sm text-slate-500 shrink-0", className)}>
      {formatDiscountLabel(discountType, t)}
    </span>
  );
}
