import { describe, expect, it } from "vitest";
import {
  aggregateSalesRows,
  hasTruncatedResults,
  isSummaryConsistent,
  isValidSalesPeriod,
  normalizeSalesPeriod,
} from "./sales-overview";

describe("sales overview helpers", () => {
  it("validates supported periods", () => {
    expect(isValidSalesPeriod("daily")).toBe(true);
    expect(isValidSalesPeriod("weekly")).toBe(true);
    expect(isValidSalesPeriod("monthly")).toBe(true);
    expect(isValidSalesPeriod("yearly")).toBe(false);
    expect(isValidSalesPeriod("")).toBe(false);
  });

  it("normalizes invalid periods to daily", () => {
    expect(normalizeSalesPeriod("MONTHLY")).toBe("monthly");
    expect(normalizeSalesPeriod("invalid")).toBe("daily");
  });

  it("aggregates sales rows with correct totals", () => {
    const summary = aggregateSalesRows([
      { subTotal: 100, discountAmount: 10, totalAmount: 90 },
      { subTotal: 200, discountAmount: 30, totalAmount: 170 },
    ]);

    expect(summary.totalSales).toBe(300);
    expect(summary.totalDiscounts).toBe(40);
    expect(summary.netRevenue).toBe(260);
    expect(summary.invoiceCount).toBe(2);
  });

  it("returns zero summary for empty sales", () => {
    const summary = aggregateSalesRows([]);

    expect(summary).toEqual({
      totalSales: 0,
      totalDiscounts: 0,
      netRevenue: 0,
      invoiceCount: 0,
    });
  });

  it("checks discount application accuracy", () => {
    const summary = aggregateSalesRows([
      { subTotal: 200, discountAmount: 30, totalAmount: 170 },
    ]);

    expect(summary.totalSales - summary.totalDiscounts).toBe(summary.netRevenue);
    expect(isSummaryConsistent(summary)).toBe(true);
  });

  it("flags truncated result sets", () => {
    expect(hasTruncatedResults(120, 100)).toBe(true);
    expect(hasTruncatedResults(50, 50)).toBe(false);
  });
});
