"use client";

import { useTranslations } from "next-intl";

const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

export function normalizePhone(value?: string | null): string {
  if (!value) return "";
  return sanitizePhoneInput(value.trim());
}

export function isPhoneDuplicate(
  phone: string,
  existingPhones: Array<{ id: string; phone?: string | null }>,
  excludeId?: string | null
): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  return existingPhones.some(
    (c) => c.id !== excludeId && normalizePhone(c.phone) === normalized
  );
}

export function usePhoneValidation() {
  const t = useTranslations("validation");

  const validatePhone = (phone: string, required = true): string | null => {
    const digits = normalizePhone(phone);

    if (!digits) return required ? t("phoneRequired") : null;
    if (digits.length < MIN_DIGITS) return t("phoneMinLength", { min: MIN_DIGITS });
    if (digits.length > MAX_DIGITS) return t("phoneMaxLength", { max: MAX_DIGITS });
    return null;
  };

  const validatePhoneUnique = (
    phone: string,
    existingPhones: Array<{ id: string; phone?: string | null }>,
    excludeId?: string | null
  ): string | null => {
    if (isPhoneDuplicate(phone, existingPhones, excludeId)) return t("phoneDuplicate");
    return null;
  };

  return { validatePhone, validatePhoneUnique, sanitizePhoneInput, normalizePhone };
}

export function formatPhoneDisplay(phone?: string | null): string {
  return normalizePhone(phone);
}

export function isPhoneValidationMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("phone number");
}

export function resolvePhoneApiError(
  message: string,
  t: (key: "phoneRequired" | "phoneMinLength" | "phoneMaxLength" | "phoneDuplicate" | "phoneDigitsOnly") => string
): string {
  const lower = message.toLowerCase();
  if (lower.includes("already exists")) return t("phoneDuplicate");
  if (lower.includes("required")) return t("phoneRequired");
  if (lower.includes("digits only")) return t("phoneDigitsOnly");
  if (lower.includes("at least")) return t("phoneMinLength");
  if (lower.includes("not exceed") || lower.includes("exceed")) return t("phoneMaxLength");
  return message;
}
