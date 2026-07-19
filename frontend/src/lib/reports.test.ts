import { describe, expect, it } from "vitest";
import {
  buildReportCsv,
  buildReportQuery,
  DEFAULT_REPORT_FILTERS,
  filterReportRows,
  getCurrentMonthDateRange,
  paginateRows,
  sortByNumber,
  type PeriodReport,
} from "./reports";

const sampleReport: PeriodReport = {
  period: "monthly",
  startDate: "2026-07-01T00:00:00Z",
  endDate: "2026-07-16T23:59:59Z",
  totalSales: 1000,
  totalRevenue: 950,
  totalProfit: 700,
  totalExpenses: 250,
  totalDiscounts: 50,
  totalTaxes: 0,
  invoiceCount: 5,
  customerCount: 4,
  appointmentCount: 3,
  productsSoldCount: 10,
  servicesSoldCount: 8,
  averageInvoiceValue: 190,
  salesByCategory: [{ category: "Service", revenue: 600, count: 4 }],
  salesByEmployee: [{ employeeId: "1", employeeName: "Ada", revenue: 400, invoiceCount: 2 }],
  productsSold: [
    {
      productId: "p1",
      productSku: "SKU",
      productName: "Shampoo",
      productType: "Product",
      productCategory: "Retail",
      quantitySold: 3,
      totalSalesAmount: 90,
    },
  ],
  servicesSold: [
    {
      serviceOfferingId: "s1",
      serviceName: "Cut",
      serviceType: "Service",
      serviceCategory: "Hair",
      timesSold: 2,
      totalRevenue: 200,
    },
  ],
  paymentMethodSummary: [{ paymentMethod: "Cash", invoiceCount: 5, totalAmount: 950 }],
  revenueTrend: [{ date: "2026-07-01", revenue: 100, invoiceCount: 1, customerCount: 1 }],
};

describe("getCurrentMonthDateRange", () => {
  it("returns first and last day of the given month", () => {
    const { from, to } = getCurrentMonthDateRange(new Date(2026, 6, 19)); // July
    expect(from).toBe("2026-07-01");
    expect(to).toBe("2026-07-31");
  });
});

describe("buildReportQuery", () => {
  it("builds period path with branch and filters", () => {
    const query = buildReportQuery(
      {
        ...DEFAULT_REPORT_FILTERS,
        period: "weekly",
        branchId: "b1",
        employeeId: "e1",
        paymentMethod: "Cash",
        status: "Completed",
      },
      "fallback"
    );
    expect(query).toContain("/reports/period/weekly?");
    expect(query).toContain("branchId=b1");
    expect(query).toContain("employeeId=e1");
    expect(query).toContain("paymentMethod=Cash");
    expect(query).toContain("status=Completed");
  });

  it("uses custom dates for custom period", () => {
    const query = buildReportQuery({
      ...DEFAULT_REPORT_FILTERS,
      period: "custom",
      from: "2026-07-01",
      to: "2026-07-10",
    });
    expect(query).toContain("/reports/period/custom?");
    expect(query).toContain("from=2026-07-01");
    expect(query).toContain("to=2026-07-10");
  });
});

describe("report table helpers", () => {
  it("filters, sorts, and paginates rows", () => {
    const rows = [
      { name: "Alpha", revenue: 10 },
      { name: "Beta", revenue: 30 },
      { name: "Alpine", revenue: 20 },
    ];
    const filtered = filterReportRows(rows, "al", ["name"]);
    expect(filtered).toHaveLength(2);
    const sorted = sortByNumber(filtered, (r) => r.revenue);
    expect(sorted[0].name).toBe("Alpine");
    const page = paginateRows(sorted, 1, 1);
    expect(page.totalPages).toBe(2);
    expect(page.items).toHaveLength(1);
  });
});

describe("buildReportCsv", () => {
  it("includes summary and section totals", () => {
    const csv = buildReportCsv(sampleReport);
    expect(csv).toContain("Total Revenue,950");
    expect(csv).toContain("Service,600,4");
    expect(csv).toContain("Ada,400,2");
    expect(csv).toContain("Cash,5,950");
  });
});
