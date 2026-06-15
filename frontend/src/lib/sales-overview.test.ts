import { describe, expect, it } from "vitest";
import {
  buildSalesQuery,
  canGoToNextPage,
  canGoToPreviousPage,
  getTotalPages,
  isValidSalesPeriod,
  isValidSalesTab,
  normalizePage,
  normalizePageSize,
  normalizeSalesPeriod,
  SALES_PAGE_SIZE,
  SALES_PAGE_SIZE_OPTIONS,
} from "./sales-overview";

describe("sales overview helpers", () => {
  it("validates supported periods", () => {
    expect(isValidSalesPeriod("daily")).toBe(true);
    expect(normalizeSalesPeriod("invalid")).toBe("daily");
  });

  it("validates sales tabs", () => {
    expect(isValidSalesTab("transactions")).toBe(true);
    expect(isValidSalesTab("products")).toBe(true);
    expect(isValidSalesTab("services")).toBe(true);
    expect(isValidSalesTab("other")).toBe(false);
  });

  it("normalizes page size to allowed values", () => {
    expect(normalizePageSize(10)).toBe(10);
    expect(normalizePageSize(25)).toBe(25);
    expect(normalizePageSize(99)).toBe(SALES_PAGE_SIZE);
    expect(SALES_PAGE_SIZE_OPTIONS).toEqual([10, 25, 50]);
  });

  it("calculates total pages for pagination", () => {
    expect(getTotalPages(0, SALES_PAGE_SIZE)).toBe(0);
    expect(getTotalPages(11, SALES_PAGE_SIZE)).toBe(2);
    expect(getTotalPages(100, 25)).toBe(4);
  });

  it("controls pagination navigation", () => {
    expect(canGoToPreviousPage(1)).toBe(false);
    expect(canGoToNextPage(1, 3)).toBe(true);
    expect(canGoToNextPage(3, 3)).toBe(false);
  });

  it("normalizes page within bounds", () => {
    expect(normalizePage(0, 5)).toBe(1);
    expect(normalizePage(9, 5)).toBe(5);
  });

  it("builds sales query string", () => {
    const query = buildSalesQuery("weekly", { page: 2, pageSize: 25 }, "abc-123");
    expect(query).toContain("period=weekly");
    expect(query).toContain("page=2");
    expect(query).toContain("pageSize=25");
    expect(query).toContain("branchId=abc-123");
  });
});
