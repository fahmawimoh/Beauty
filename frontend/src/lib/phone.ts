"use client";

import { useTranslations } from "next-intl";

const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_DIGITS);
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
