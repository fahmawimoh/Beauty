export const SALES_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
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

export interface ProductSalesAggregateRow {
  productId?: string | null;
  productName: string;
  productType: string;
  productCategory: string;
  quantitySold: number;
  totalSalesAmount: number;
}

export interface ProductSalesRow {
  lineItemId: string;
  productId?: string | null;
  productName: string;
  productType: string;
  productCategory: string;
  soldAt: string;
  quantitySold: number;
  totalSalesAmount: number;
}

export interface ServiceSalesRow {
  lineItemId: string;
  serviceOfferingId?: string | null;
  serviceName: string;
  serviceType: string;
  serviceCategory: string;
  soldAt: string;
  timesSold: number;
  totalRevenue: number;
}

export interface SalesFilters {
  period: SalesPeriod;
  from: string;
  to: string;
  type: string;
  entityId: string;
  transactionSearch: string;
}

export const DEFAULT_SALES_FILTERS: SalesFilters = {
  period: "daily",
  from: "",
  to: "",
  type: "",
  entityId: "",
  transactionSearch: "",
};

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
  yearly: SalesPeriodSummary;
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

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuid(value: string): boolean {
  return GUID_PATTERN.test(value.trim());
}

export function formatShortId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
}

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
  filters: SalesFilters,
  pagination: TabPaginationState,
  branchId?: string
): string {
  const params = new URLSearchParams({
    period: filters.period,
    page: String(pagination.page),
    pageSize: String(pagination.pageSize),
  });
  if (branchId) params.set("branchId", branchId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.type.trim()) params.set("type", filters.type.trim());
  if (filters.entityId.trim() && isValidGuid(filters.entityId)) {
    params.set("id", filters.entityId.trim());
  }
  if (filters.transactionSearch.trim()) {
    params.set("transactionId", filters.transactionSearch.trim());
  }
  return `?${params.toString()}`;
}

export function matchesTransactionSearch(
  invoiceId: string,
  invoiceNumber: string,
  search: string
): boolean {
  if (!search.trim()) return true;
  const term = search.trim();
  if (isValidGuid(term)) return invoiceId.toLowerCase() === term.toLowerCase();
  const lower = term.toLowerCase();
  return (
    invoiceNumber.toLowerCase().includes(lower) ||
    invoiceId.toLowerCase().includes(lower)
  );
}
