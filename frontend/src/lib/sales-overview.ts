export const SALES_PERIODS = ["daily", "weekly", "monthly"] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

export interface SalesPeriodSummary {
  totalSales: number;
  totalDiscounts: number;
  netRevenue: number;
  invoiceCount: number;
}

export interface SalesRow {
  id: string;
  invoiceNumber: string;
  customerName?: string | null;
  cashierName: string;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
}

export interface SalesOverview {
  period: SalesPeriod;
  startDate: string;
  endDate: string;
  current: SalesPeriodSummary;
  daily: SalesPeriodSummary;
  weekly: SalesPeriodSummary;
  monthly: SalesPeriodSummary;
  sales: SalesRow[];
  totalSalesCount: number;
}

export function isValidSalesPeriod(value: string): value is SalesPeriod {
  return (SALES_PERIODS as readonly string[]).includes(value.toLowerCase());
}

export function normalizeSalesPeriod(value: string): SalesPeriod {
  const normalized = value.toLowerCase();
  return isValidSalesPeriod(normalized) ? normalized : "daily";
}

export function aggregateSalesRows(rows: Pick<SalesRow, "subTotal" | "discountAmount" | "totalAmount">[]): SalesPeriodSummary {
  if (rows.length === 0) {
    return { totalSales: 0, totalDiscounts: 0, netRevenue: 0, invoiceCount: 0 };
  }

  return {
    totalSales: rows.reduce((sum, row) => sum + row.subTotal, 0),
    totalDiscounts: rows.reduce((sum, row) => sum + row.discountAmount, 0),
    netRevenue: rows.reduce((sum, row) => sum + row.totalAmount, 0),
    invoiceCount: rows.length,
  };
}

export function isSummaryConsistent(summary: SalesPeriodSummary): boolean {
  return (
    summary.totalSales >= 0 &&
    summary.totalDiscounts >= 0 &&
    summary.netRevenue >= 0 &&
    summary.invoiceCount >= 0 &&
    summary.totalDiscounts <= summary.totalSales
  );
}

export function hasTruncatedResults(totalSalesCount: number, loadedCount: number): boolean {
  return totalSalesCount > loadedCount;
}
