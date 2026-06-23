"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { usePhoneValidation } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, error, className, onKeyDown, onPaste, onInput, ...props }, ref) => {
    const t = useTranslations("validation");
    const { sanitizePhoneInput } = usePhoneValidation();

    const emitChange = (raw: string) => {
      onChange(sanitizePhoneInput(raw));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
      if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) {
        onKeyDown?.(e);
        return;
      }
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      emitChange(value + pasted);
      onPaste?.(e);
    };

    return (
      <div className="w-full">
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          name="phone"
          placeholder={t("phonePlaceholder")}
          value={value}
          onChange={(e) => emitChange(e.target.value)}
          onInput={(e) => {
            emitChange(e.currentTarget.value);
            onInput?.(e);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={cn(error && "border-red-400 focus:border-red-500 focus:ring-red-500/20", className)}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        {!error && <p className="mt-1 text-xs text-slate-400">{t("phoneHint")}</p>}
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";
