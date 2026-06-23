"use client";

import { useTranslations } from "next-intl";

const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/** Maps Eastern Arabic / Persian digits to ASCII 0-9 before stripping non-digits. */
function normalizeUnicodeDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F6]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function sanitizePhoneInput(value: string): string {
  return normalizeUnicodeDigits(value).replace(/\D/g, "").slice(0, MAX_DIGITS);
}

export function usePhoneValidation() {
  const t = useTranslations("validation");

  const validatePhone = (phone: string, required = true): string | null => {
    const digits = sanitizePhoneInput(phone);

    if (!digits) return required ? t("phoneRequired") : null;
    if (!/^\d+$/.test(digits)) return t("phoneDigitsOnly");
    if (digits.length < MIN_DIGITS) return t("phoneMinLength", { min: MIN_DIGITS });
    if (digits.length > MAX_DIGITS) return t("phoneMaxLength", { max: MAX_DIGITS });
    return null;
  };

  return { validatePhone, sanitizePhoneInput };
}

export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return "";
  return sanitizePhoneInput(phone);
}
