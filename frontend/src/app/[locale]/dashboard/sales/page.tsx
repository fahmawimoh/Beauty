"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Banknote, Percent, TrendingUp, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { formatDiscountDisplay, normalizeDiscountType } from "@/lib/discount";
import {
  buildSalesQuery,
  DEFAULT_SALES_FILTERS,
  DEFAULT_TAB_PAGINATION,
  formatShortId,
  normalizePage,
  normalizePageSize,
  normalizeSalesPeriod,
  SALES_TABS,
  type ProductSalesPage,
  type SalesFilters,
  type SalesPeriod,
  type SalesPeriodSummary,
  type SalesRow,
  type SalesSummary,
  type SalesTab,
  type SalesTransactionsPage,
  type ServiceSalesPage,
  type TabPaginationState,
} from "@/lib/sales-overview";
import { useAuthStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { SalesGlobalFilterBar } from "@/components/sales/sales-global-filter-bar";
import { TablePagination } from "@/components/sales/table-pagination";
import type { Invoice } from "@/types";

const TAB_ENDPOINTS: Record<SalesTab, string> = {
  transactions: "/reports/sales/transactions",
  products: "/reports/sales/products",
  services: "/reports/sales/services",
};

function createDefaultPagination(): Record<SalesTab, TabPaginationState> {
  return {
    transactions: { ...DEFAULT_TAB_PAGINATION },
    products: { ...DEFAULT_TAB_PAGINATION },
    services: { ...DEFAULT_TAB_PAGINATION },
  };
}

const EMPTY_PERIOD_SUMMARY: SalesPeriodSummary = {
  totalSales: 0,
  totalDiscounts: 0,
  netRevenue: 0,
  invoiceCount: 0,
};

export default function SalesPage() {
  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const locale = useLocale();
  const fmt = (amount: number) => formatCurrency(amount, locale);
  const { user } = useAuthStore();

  const [appliedFilters, setAppliedFilters] = useState<SalesFilters>(DEFAULT_SALES_FILTERS);
  const [activeTab, setActiveTab] = useState<SalesTab>("transactions");
  const [pagination, setPagination] = useState(createDefaultPagination);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [transactions, setTransactions] = useState<SalesTransactionsPage | null>(null);
  const [products, setProducts] = useState<ProductSalesPage | null>(null);
  const [services, setServices] = useState<ServiceSalesPage | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const branchId = user?.branchId;

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setError(null);
    try {
      const query = buildSalesQuery(appliedFilters, DEFAULT_TAB_PAGINATION, branchId);
      const data = await api.get<SalesSummary>(`/reports/sales/summary${query}`);
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setSummaryLoading(false);
    }
  }, [appliedFilters, branchId, t]);

  const loadTabData = useCallback(async () => {
    const tabPagination = pagination[activeTab];
    setTabLoading(true);
    setError(null);
    try {
      const query = buildSalesQuery(appliedFilters, tabPagination, branchId);
      const endpoint = TAB_ENDPOINTS[activeTab];

      if (activeTab === "transactions") {
        const data = await api.get<SalesTransactionsPage>(`${endpoint}${query}`);
        if (data.totalPages > 0 && tabPagination.page > data.totalPages) {
          setPagination((prev) => ({
            ...prev,
            transactions: { ...prev.transactions, page: data.totalPages },
          }));
          return;
        }
        setTransactions(data);
      } else if (activeTab === "products") {
        const data = await api.get<ProductSalesPage>(`${endpoint}${query}`);
        if (data.totalPages > 0 && tabPagination.page > data.totalPages) {
          setPagination((prev) => ({
            ...prev,
            products: { ...prev.products, page: data.totalPages },
          }));
          return;
        }
        setProducts(data);
      } else {
        const data = await api.get<ServiceSalesPage>(`${endpoint}${query}`);
        if (data.totalPages > 0 && tabPagination.page > data.totalPages) {
          setPagination((prev) => ({
            ...prev,
            services: { ...prev.services, page: data.totalPages },
          }));
          return;
        }
        setServices(data);
      }
    } catch (err) {
      if (activeTab === "transactions") setTransactions(null);
      if (activeTab === "products") setProducts(null);
      if (activeTab === "services") setServices(null);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setTabLoading(false);
    }
  }, [activeTab, appliedFilters, pagination, branchId, t]);

  const isPageLoading = summaryLoading || tabLoading;

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadTabData();
  }, [loadTabData]);

  const handlePeriodSelect = (nextPeriod: SalesPeriod) => {
    setAppliedFilters((prev) => ({
      ...prev,
      period: normalizeSalesPeriod(nextPeriod),
      from: "",
      to: "",
    }));
    setPagination(createDefaultPagination());
  };

  const handleResetFilters = () => {
    setAppliedFilters(DEFAULT_SALES_FILTERS);
    setPagination(createDefaultPagination());
  };

  const handleTabChange = (tab: SalesTab) => {
    setActiveTab(tab);
  };

  const updateTabPagination = (tab: SalesTab, updates: Partial<TabPaginationState>) => {
    setPagination((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], ...updates },
    }));
  };

  const openSaleDetails = async (row: SalesRow) => {
    setDetailLoading(true);
    try {
      const invoice = await api.get<Invoice>(`/invoices/${row.id}`);
      setSelected(invoice);
    } catch {
      setError(t("detailError"));
    } finally {
      setDetailLoading(false);
    }
  };

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";
  const current = summary?.current;
  const periodSummaries = summary
    ? [
        { key: "daily" as const, label: tReports("periods.daily"), summary: summary.daily },
        { key: "weekly" as const, label: tReports("periods.weekly"), summary: summary.weekly },
        { key: "monthly" as const, label: tReports("periods.monthly"), summary: summary.monthly },
        { key: "yearly" as const, label: tReports("periods.yearly"), summary: summary.yearly },
      ].map((entry) => ({
        ...entry,
        summary: entry.summary ?? EMPTY_PERIOD_SUMMARY,
      }))
    : [];

  const stats = current
    ? [
        { label: t("totalSales"), value: fmt(current.totalSales), color: "text-violet-600", icon: Banknote },
        { label: t("appliedDiscounts"), value: fmt(current.totalDiscounts), color: "text-amber-600", icon: Percent },
        { label: t("netRevenue"), value: fmt(current.netRevenue), color: "text-emerald-600", icon: TrendingUp },
      ]
    : [];

  const renderTabContent = () => {
    if (tabLoading && !transactions && !products && !services) {
      return <p className="p-8 text-center text-sm text-slate-400">{tCommon("loading")}</p>;
    }

    if (activeTab === "transactions") {
      if (!transactions || transactions.items.length === 0) {
        return <p className="p-8 text-center text-sm text-slate-400">{t("noSales")}</p>;
      }
      return (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-slate-500">
                  <th className="px-4 py-3 font-medium">{t("transactionId")}</th>
                  <th className="px-4 py-3 font-medium">{t("invoiceNumber")}</th>
                  <th className="px-4 py-3 font-medium">{t("itemType")}</th>
                  <th className="px-4 py-3 font-medium">{tCommon("date")}</th>
                  <th className="px-4 py-3 font-medium">{t("itemName")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("transactionTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.items.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => void openSaleDetails(invoice)}
                    className="border-b border-slate-50 hover:bg-violet-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" title={invoice.id}>
                      {formatShortId(invoice.id)}
                    </td>
                    <td className="px-4 py-3 font-medium text-violet-700">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.itemType}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(invoice.createdAt).toLocaleString(dateLocale)}
                    </td>
                    <td className="px-4 py-3 text-slate-900 max-w-[200px] truncate" title={invoice.itemName}>
                      {invoice.itemName}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold">{fmt(invoice.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={transactions.page}
            pageSize={transactions.pageSize}
            totalPages={transactions.totalPages}
            totalCount={transactions.totalCount}
            disabled={tabLoading}
            onPageChange={(page) => updateTabPagination("transactions", { page: normalizePage(page, transactions.totalPages) })}
            onPageSizeChange={(pageSize) =>
              updateTabPagination("transactions", { pageSize: normalizePageSize(pageSize), page: 1 })
            }
          />
        </>
      );
    }

    if (activeTab === "products") {
      if (!products || products.items.length === 0) {
        return <p className="p-8 text-center text-sm text-slate-400">{t("noProductSales")}</p>;
      }
      return (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start text-slate-500">
                  <th className="px-4 py-3 font-medium">{t("productId")}</th>
                  <th className="px-4 py-3 font-medium">{tCommon("name")}</th>
                  <th className="px-4 py-3 font-medium">{t("productType")}</th>
                  <th className="px-4 py-3 font-medium">{t("productCategory")}</th>
                  <th className="px-4 py-3 font-medium">{tCommon("date")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("quantitySold")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("productSalesAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {products.items.map((product) => (
                  <tr key={product.lineItemId} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500" title={product.productId ?? undefined}>
                      {formatShortId(product.productId)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{product.productName}</td>
                    <td className="px-4 py-3 text-slate-600">{product.productType}</td>
                    <td className="px-4 py-3 text-slate-600">{product.productCategory}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(product.soldAt).toLocaleString(dateLocale)}
                    </td>
                    <td className="px-4 py-3 text-end">{product.quantitySold}</td>
                    <td className="px-4 py-3 text-end font-semibold">{fmt(product.totalSalesAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-4 py-3" colSpan={5}>{t("productGrandTotal")}</td>
                  <td className="px-4 py-3 text-end">{products.totalQuantitySold}</td>
                  <td className="px-4 py-3 text-end text-violet-700">{fmt(products.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <TablePagination
            page={products.page}
            pageSize={products.pageSize}
            totalPages={products.totalPages}
            totalCount={products.totalCount}
            disabled={tabLoading}
            onPageChange={(page) => updateTabPagination("products", { page: normalizePage(page, products.totalPages) })}
            onPageSizeChange={(pageSize) =>
              updateTabPagination("products", { pageSize: normalizePageSize(pageSize), page: 1 })
            }
          />
        </>
      );
    }

    if (!services || services.items.length === 0) {
      return <p className="p-8 text-center text-sm text-slate-400">{t("noServiceSales")}</p>;
    }
    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-start text-slate-500">
                <th className="px-4 py-3 font-medium">{t("serviceId")}</th>
                <th className="px-4 py-3 font-medium">{t("serviceName")}</th>
                <th className="px-4 py-3 font-medium">{t("serviceType")}</th>
                <th className="px-4 py-3 font-medium">{t("serviceCategory")}</th>
                <th className="px-4 py-3 font-medium">{tCommon("date")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("timesSold")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("serviceRevenue")}</th>
              </tr>
            </thead>
            <tbody>
              {services.items.map((service) => (
                <tr key={service.lineItemId} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500" title={service.serviceOfferingId ?? undefined}>
                    {formatShortId(service.serviceOfferingId)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{service.serviceName}</td>
                  <td className="px-4 py-3 text-slate-600">{service.serviceType}</td>
                  <td className="px-4 py-3 text-slate-600">{service.serviceCategory}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(service.soldAt).toLocaleString(dateLocale)}
                  </td>
                  <td className="px-4 py-3 text-end">{service.timesSold}</td>
                  <td className="px-4 py-3 text-end font-semibold">{fmt(service.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-3" colSpan={5}>{t("serviceGrandTotal")}</td>
                <td className="px-4 py-3 text-end">{services.totalTimesSold}</td>
                <td className="px-4 py-3 text-end text-violet-700">{fmt(services.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <TablePagination
          page={services.page}
          pageSize={services.pageSize}
          totalPages={services.totalPages}
          totalCount={services.totalCount}
          disabled={tabLoading}
          onPageChange={(page) => updateTabPagination("services", { page: normalizePage(page, services.totalPages) })}
          onPageSizeChange={(pageSize) =>
            updateTabPagination("services", { pageSize: normalizePageSize(pageSize), page: 1 })
          }
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <SalesGlobalFilterBar
        applied={appliedFilters}
        onPeriodSelect={handlePeriodSelect}
        onReset={handleResetFilters}
        loading={isPageLoading}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => {
              void loadSummary();
              void loadTabData();
            }}
            className="font-medium underline"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {summaryLoading && !summary ? (
        <p className="text-center text-sm text-slate-400 py-8">{tCommon("loading")}</p>
      ) : summary ? (
        <div className="relative space-y-6">
          {summaryLoading && (
            <div className="absolute inset-0 z-10 flex items-start justify-center pt-16 bg-white/50 rounded-lg">
              <p className="text-sm text-slate-500">{tCommon("loading")}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{s.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {t("invoiceCount", { count: current?.invoiceCount ?? 0 })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-violet-50 p-2">
                      <s.icon className="h-5 w-5 text-violet-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-900">{t("periodComparison")}</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {periodSummaries.map(({ key, label, summary: periodSummary }) => (
                  <div
                    key={key}
                    className={`rounded-lg border p-4 ${
                      appliedFilters.period === key && !appliedFilters.from && !appliedFilters.to
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-600">{label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{fmt(periodSummary.netRevenue)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("salesAndDiscounts", {
                        sales: fmt(periodSummary.totalSales),
                        discounts: fmt(periodSummary.totalDiscounts),
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("invoiceCount", { count: periodSummary.invoiceCount })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">{t(`tabs.${activeTab}`)}</h2>
              {summary?.startDate && summary?.endDate && (
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(summary.startDate).toLocaleDateString(dateLocale)} –{" "}
                  {new Date(summary.endDate).toLocaleDateString(dateLocale)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {SALES_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab ? "bg-white text-violet-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0 relative">
          {tabLoading && (transactions || products || services) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <p className="text-sm text-slate-500">{tCommon("loading")}</p>
            </div>
          )}
          {renderTabContent()}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onClose={() => setSelected(null)} title={t("saleDetails")} size="lg">
        {detailLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">{tCommon("loading")}</p>
        ) : selected ? (
          <>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
              <span>
                <span className="text-slate-400">{t("invoiceNumber")}:</span> {selected.invoiceNumber}
              </span>
              <span>
                <span className="text-slate-400">{tCommon("date")}:</span>{" "}
                {new Date(selected.createdAt).toLocaleString(dateLocale)}
              </span>
              <span>
                <span className="text-slate-400">{t("cashier")}:</span> {selected.cashierName}
              </span>
              {selected.customerName && (
                <span>
                  <span className="text-slate-400">{t("customer")}:</span> {selected.customerName}
                </span>
              )}
            </div>

            <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
              {selected.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {item.itemType} · {fmt(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">{fmt(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{tCommon("subtotal")}</span>
                <span>{fmt(selected.subTotal)}</span>
              </div>
              {selected.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{tCommon("discount")}</span>
                  <span>
                    {formatDiscountDisplay(
                      normalizeDiscountType(selected.discountType),
                      selected.discountValue,
                      selected.discountAmount,
                      fmt
                    )}
                  </span>
                </div>
              )}
              {selected.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{tCommon("tax")}</span>
                  <span>{fmt(selected.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span>{tCommon("total")}</span>
                <span className="text-violet-600">{fmt(selected.totalAmount)}</span>
              </div>
            </div>
          </>
        ) : null}
      </Dialog>
    </div>
  );
}
