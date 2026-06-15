export type DiscountType = "PERCENTAGE" | "FIXED";

export type DiscountValidationError = "decimalOrNegative" | "percentRange" | "fixedMax";

export const DEFAULT_DISCOUNT_TYPE: DiscountType = "PERCENTAGE";

const BLOCKED_DISCOUNT_KEYS = ["-", "+", ".", ",", "e", "E"];

export function normalizeDiscountType(value?: string | null): DiscountType {
  return value?.toUpperCase() === "FIXED" ? "FIXED" : "PERCENTAGE";
}

export function isWholeNumber(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value);
}

/** Keeps only a non-negative integer digit sequence from user input. */
export function sanitizeDiscountInput(raw: string): string {
  const match = raw.match(/^\d*/);
  return match ? match[0] : "";
}

export function parseDiscountInput(raw: string): number {
  const sanitized = sanitizeDiscountInput(raw);
  if (!sanitized) return 0;
  return parseInt(sanitized, 10);
}

export function isBlockedDiscountKey(key: string): boolean {
  return BLOCKED_DISCOUNT_KEYS.includes(key);
}

export function calculateDiscountAmount(
  discountType: DiscountType,
  subtotal: number,
  discountValue: number
): number {
  if (discountValue <= 0 || subtotal <= 0) return 0;

  const amount =
    discountType === "PERCENTAGE"
      ? subtotal * (discountValue / 100)
      : Math.min(discountValue, subtotal);

  return Math.round(amount * 100) / 100;
}

export function validateDiscountValue(
  discountType: DiscountType,
  discountValue: number,
  subtotal: number
): DiscountValidationError | null {
  if (discountValue === 0) return null;

  if (discountValue < 0 || !isWholeNumber(discountValue)) return "decimalOrNegative";

  if (discountType === "PERCENTAGE") {
    if (discountValue > 100) return "percentRange";
    return null;
  }

  if (subtotal > 0 && discountValue > subtotal) return "fixedMax";
  return null;
}

export function isDiscountValid(
  discountType: DiscountType,
  discountValue: number,
  subtotal: number
): boolean {
  return validateDiscountValue(discountType, discountValue, subtotal) === null;
}

export function formatDiscountLabel(
  discountType: DiscountType,
  t: (key: string) => string
): string {
  return discountType === "PERCENTAGE" ? t("percentDiscount") : t("amountDiscount");
}

export function formatDiscountDisplay(
  discountType: DiscountType,
  discountValue: number,
  discountAmount: number,
  fmt: (amount: number) => string
): string {
  if (discountAmount <= 0) return fmt(0);
  if (discountType === "PERCENTAGE" && discountValue > 0) {
    return `${discountValue}% (-${fmt(discountAmount)})`;
  }
  return `-${fmt(discountAmount)}`;
}
