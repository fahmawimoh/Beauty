import { describe, expect, it } from "vitest";
import {
  calculateDiscountAmount,
  isDiscountValid,
  parseDiscountInput,
  sanitizeDiscountInput,
  validateDiscountValue,
} from "./discount";

describe("discount validation", () => {
  it("allows sale without discount", () => {
    expect(isDiscountValid("PERCENTAGE", 0, 100)).toBe(true);
    expect(calculateDiscountAmount("PERCENTAGE", 100, 0)).toBe(0);
  });

  it("calculates percentage discount", () => {
    expect(calculateDiscountAmount("PERCENTAGE", 200, 10)).toBe(20);
    expect(isDiscountValid("PERCENTAGE", 10, 200)).toBe(true);
  });

  it("calculates fixed discount", () => {
    expect(calculateDiscountAmount("FIXED", 200, 30)).toBe(30);
    expect(isDiscountValid("FIXED", 30, 200)).toBe(true);
  });

  it("rejects invalid discount values", () => {
    expect(validateDiscountValue("PERCENTAGE", -5, 100)).toBe("decimalOrNegative");
    expect(validateDiscountValue("PERCENTAGE", 150, 100)).toBe("percentRange");
    expect(validateDiscountValue("PERCENTAGE", 10.5, 100)).toBe("decimalOrNegative");
    expect(validateDiscountValue("FIXED", 250, 200)).toBe("fixedMax");
  });

  it("sanitizes blocked input", () => {
    expect(sanitizeDiscountInput("-5")).toBe("");
    expect(sanitizeDiscountInput("10.5")).toBe("10");
    expect(parseDiscountInput("150")).toBe(150);
  });

  it("matches receipt total calculation", () => {
    const subtotal = 200;
    const discountValue = 15;
    const discountAmount = calculateDiscountAmount("PERCENTAGE", subtotal, discountValue);
    const total = subtotal - discountAmount;

    expect(discountAmount).toBe(30);
    expect(total).toBe(170);
  });
});
