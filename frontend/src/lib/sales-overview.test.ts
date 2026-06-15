import { describe, expect, it } from "vitest";
import {
  aggregateProductSales,
  aggregateSalesRows,
  hasTruncatedResults,
  isSummaryConsistent,
  isValidSalesPeriod,
  normalizeSalesPeriod,
  verifyProductSalesTotals,
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

  it("aggregates product sales across multiple lines", () => {
    const report = aggregateProductSales([
      { productId: "p1", productName: "Shampoo", productCategory: "SKU-01", quantitySold: 2, totalSalesAmount: 40 },
      { productId: "p1", productName: "Shampoo", productCategory: "SKU-01", quantitySold: 3, totalSalesAmount: 60 },
      { productId: "p2", productName: "Conditioner", productCategory: "SKU-02", quantitySold: 1, totalSalesAmount: 25 },
    ]);

    expect(report.products).toHaveLength(2);
    expect(report.grandTotal).toBe(125);
    expect(report.totalQuantitySold).toBe(6);
    expect(report.products[0].productName).toBe("Shampoo");
    expect(report.products[0].quantitySold).toBe(5);
    expect(report.products[0].totalSalesAmount).toBe(100);
    expect(verifyProductSalesTotals(report)).toBe(true);
  });

  it("handles zero product sales", () => {
    const report = aggregateProductSales([]);
    expect(report.products).toHaveLength(0);
    expect(report.grandTotal).toBe(0);
    expect(report.totalQuantitySold).toBe(0);
    expect(verifyProductSalesTotals(report)).toBe(true);
  });

  it("groups products without id by name", () => {
    const report = aggregateProductSales([
      { productId: null, productName: "Walk-in Item", productCategory: "General", quantitySold: 1, totalSalesAmount: 10 },
      { productId: null, productName: "Walk-in Item", productCategory: "General", quantitySold: 2, totalSalesAmount: 20 },
    ]);

    expect(report.products).toHaveLength(1);
    expect(report.products[0].quantitySold).toBe(3);
    expect(report.products[0].totalSalesAmount).toBe(30);
  });
});
