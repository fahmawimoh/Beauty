import { describe, expect, it } from "vitest";
import { sanitizePhoneInput } from "./phone";

describe("sanitizePhoneInput", () => {
  it("keeps ASCII digits", () => {
    expect(sanitizePhoneInput("0791234567")).toBe("0791234567");
  });

  it("strips formatting characters", () => {
    expect(sanitizePhoneInput("+962 79-123-4567")).toBe("962791234567");
  });

  it("normalizes Eastern Arabic numerals", () => {
    expect(sanitizePhoneInput("٠٧٩١٢٣٤٥٦٧")).toBe("0791234567");
  });

  it("returns empty string for non-digit input", () => {
    expect(sanitizePhoneInput("abc")).toBe("");
  });
});
