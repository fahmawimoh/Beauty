export const SALES_PERIODS = ["daily", "weekly", "monthly"] as const;
export const SALES_PAGE_SIZE = 10;
export const SALES_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const SALES_TABS = ["transactions", "products", "services"] as const;

export type SalesPeriod = (typeof SALES_PERIODS)[number];
export type SalesTab = (typeof SALES_TABS)[number];
export type PageSize = (typeof SALES_PAGE_SIZE_OPTIONS)[number];

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
  itemName: string;
  itemType: string;
  subTotal: number;
  discountAmount: number;
  totalAmount: number;
  createdAt: string;
}

export interface ProductSalesRow {
  productId?: string | null;
  productName: string;
  productType: string;
  productCategory: string;
  quantitySold: number;
  totalSalesAmount: number;
}

export interface ServiceSalesRow {
  serviceOfferingId?: string | null;
  serviceName: string;
  serviceType: string;
  serviceCategory: string;
  timesSold: number;
  totalRevenue: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SalesSummary {
  period: SalesPeriod;
  startDate: string;
  endDate: string;
  current: SalesPeriodSummary;
  daily: SalesPeriodSummary;
  weekly: SalesPeriodSummary;
  monthly: SalesPeriodSummary;
}

export interface SalesTransactionsPage extends PaginatedResponse<SalesRow> {
  startDate: string;
  endDate: string;
}

export interface ProductSalesPage extends PaginatedResponse<ProductSalesRow> {
  grandTotal: number;
  totalQuantitySold: number;
}

export interface ServiceSalesPage extends PaginatedResponse<ServiceSalesRow> {
  grandTotal: number;
  totalTimesSold: number;
}

export interface TabPaginationState {
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_TAB_PAGINATION: TabPaginationState = {
  page: 1,
  pageSize: SALES_PAGE_SIZE,
};

export function isValidSalesPeriod(value: string): value is SalesPeriod {
  return (SALES_PERIODS as readonly string[]).includes(value.toLowerCase());
}

export function isValidSalesTab(value: string): value is SalesTab {
  return (SALES_TABS as readonly string[]).includes(value);
}

export function normalizeSalesPeriod(value: string): SalesPeriod {
  const normalized = value.toLowerCase();
  return isValidSalesPeriod(normalized) ? normalized : "daily";
}

export function normalizePageSize(value: number): PageSize {
  return (SALES_PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
    ? (value as PageSize)
    : SALES_PAGE_SIZE;
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (pageSize <= 0) return 0;
  return Math.ceil(totalCount / pageSize);
}

export function canGoToPreviousPage(page: number): boolean {
  return page > 1;
}

export function canGoToNextPage(page: number, totalPages: number): boolean {
  return totalPages > 0 && page < totalPages;
}

export function normalizePage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

export function buildSalesQuery(
  period: SalesPeriod,
  pagination: TabPaginationState,
  branchId?: string
): string {
  const params = new URLSearchParams({
    period,
    page: String(pagination.page),
    pageSize: String(pagination.pageSize),
  });
  if (branchId) params.set("branchId", branchId);
  return `?${params.toString()}`;
}
