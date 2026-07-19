"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Download,
  Package,
  Percent,
  Receipt,
  Scissors,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import {
  buildReportQuery,
  DEFAULT_REPORT_FILTERS,
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
  filterReportRows,
  getCurrentMonthDateRange,
  paginateRows,
  REPORT_PAYMENT_METHODS,
  REPORT_PERIODS,
  REPORT_STATUSES,
  sortByNumber,
  type PeriodReport,
  type ReportFilters,
  type ReportPeriod,
} from "@/lib/reports";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TablePagination } from "@/components/sales/table-pagination";
import type { Branch, Customer, Employee, Product, ServiceOffering } from "@/types";

const CHART_COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#e11d48", "#4f46e5"];
const PAGE_SIZE = 10;

type TableKey = "employees" | "products" | "services" | "payments";

export default function ReportsPage() {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const fmt = (amount: number) => formatCurrency(amount, locale);
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";
  const { user } = useAuthStore();

  const [filters, setFilters] = useState<ReportFilters>({
    ...DEFAULT_REPORT_FILTERS,
    branchId: user?.branchId ?? "",
  });
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [tablePages, setTablePages] = useState<Record<TableKey, number>>({
    employees: 1,
    products: 1,
    services: 1,
    payments: 1,
  });
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [branchList, employeeList, customerPage, serviceList, productPage] = await Promise.all([
        api.get<Branch[]>("/branches").catch(() => []),
        api.get<Employee[]>("/employees").catch(() => []),
        api.get<{ items: Customer[] }>("/customers?pageSize=100").catch(() => ({ items: [] })),
        api.get<ServiceOffering[]>("/services/offerings").catch(() => []),
        api.get<{ items: Product[] }>(`/products?pageSize=100${user?.branchId ? `&branchId=${user.branchId}` : ""}`).catch(() => ({ items: [] })),
      ]);
      setBranches(branchList);
      setEmployees(employeeList);
      setCustomers(customerPage.items ?? []);
      setServices(serviceList);
      setProducts(productPage.items ?? []);
    } catch {
      // Options are best-effort; report can still load.
    }
  }, [user?.branchId]);

  const loadReport = useCallback(async () => {
    if (filters.period === "custom" && (!filters.from || !filters.to)) {
      setError(t("customRangeRequired"));
      setReport(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = buildReportQuery(filters, user?.branchId);
      const data = await api.get<PeriodReport>(endpoint);
      setReport(data);
      setTablePages({ employees: 1, products: 1, services: 1, payments: 1 });
    } catch (err) {
      setReport(null);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [filters, t, user?.branchId]);

  useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const updateFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const setPeriod = (period: ReportPeriod) => {
    setFilters((prev) => {
      if (period !== "custom") {
        return { ...prev, period, from: "", to: "" };
      }
      // Always seed Custom with the current month when entering the tab.
      const monthRange = getCurrentMonthDateRange();
      return {
        ...prev,
        period,
        from: monthRange.from,
        to: monthRange.to,
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      ...DEFAULT_REPORT_FILTERS,
      branchId: user?.branchId ?? "",
    });
  };

  const search = filters.search;

  const employeeRows = useMemo(() => {
    if (!report) return [];
    const filtered = filterReportRows(report.salesByEmployee, search, ["employeeName"]);
    return sortByNumber(filtered, (r) => r.revenue);
  }, [report, search]);

  const productRows = useMemo(() => {
    if (!report) return [];
    const filtered = filterReportRows(report.productsSold, search, ["productName", "productCategory"]);
    return sortByNumber(filtered, (r) => r.totalSalesAmount);
  }, [report, search]);

  const serviceRows = useMemo(() => {
    if (!report) return [];
    const filtered = filterReportRows(report.servicesSold, search, ["serviceName", "serviceCategory"]);
    return sortByNumber(filtered, (r) => r.totalRevenue);
  }, [report, search]);

  const paymentRows = useMemo(() => {
    if (!report) return [];
    const filtered = filterReportRows(report.paymentMethodSummary, search, ["paymentMethod"]);
    return sortByNumber(filtered, (r) => r.totalAmount);
  }, [report, search]);

  const employeePage = paginateRows(employeeRows, tablePages.employees, PAGE_SIZE);
  const productPage = paginateRows(productRows, tablePages.products, PAGE_SIZE);
  const servicePage = paginateRows(serviceRows, tablePages.services, PAGE_SIZE);
  const paymentPage = paginateRows(paymentRows, tablePages.payments, PAGE_SIZE);

  const trendData = useMemo(
    () =>
      (report?.revenueTrend ?? []).map((d) => ({
        day: new Date(d.date).toLocaleDateString(dateLocale, { month: "short", day: "numeric" }),
        revenue: d.revenue,
      })),
    [report, dateLocale]
  );

  const categoryChartData = useMemo(
    () =>
      (report?.salesByCategory ?? []).map((c) => ({
        name: c.category,
        value: c.revenue,
      })),
    [report]
  );

  const summaryCards = report
    ? [
        { label: t("totalSales"), value: fmt(report.totalSales), icon: Receipt },
        { label: t("totalRevenue"), value: fmt(report.totalRevenue), icon: Banknote },
        { label: t("totalProfit"), value: fmt(report.totalProfit), icon: TrendingUp, tone: report.totalProfit >= 0 ? "text-emerald-600" : "text-red-500" },
        { label: t("totalExpenses"), value: fmt(report.totalExpenses), icon: Wallet, tone: "text-red-500" },
        { label: t("totalDiscounts"), value: fmt(report.totalDiscounts), icon: Percent, tone: "text-amber-600" },
        { label: t("totalTaxes"), value: fmt(report.totalTaxes), icon: Receipt },
        { label: t("customers"), value: String(report.customerCount), icon: Users },
        { label: t("appointments"), value: String(report.appointmentCount), icon: CalendarDays },
        { label: t("productsSold"), value: String(report.productsSoldCount), icon: Package },
        { label: t("servicesSold"), value: String(report.servicesSoldCount), icon: Scissors },
        { label: t("avgInvoice"), value: fmt(report.averageInvoiceValue), icon: Receipt },
      ]
    : [];

  const rangeLabel = report
    ? `${new Date(report.startDate).toLocaleDateString(dateLocale)} – ${new Date(report.endDate).toLocaleDateString(dateLocale)}`
    : "";

  const isEmpty =
    !!report &&
    report.invoiceCount === 0 &&
    report.appointmentCount === 0 &&
    report.totalExpenses === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500">
            {t("subtitle")}
            {rangeLabel ? ` · ${rangeLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!report}
            onClick={() => report && exportReportCsv(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            type="button"
            disabled={!report}
            onClick={() => report && exportReportExcel(report)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Excel
          </button>
          <button
            type="button"
            disabled={!report || exportingPdf}
            onClick={() => {
              if (!report) return;
              setExportingPdf(true);
              void exportReportPdf(report, t("title"), fmt)
                .catch(() => setError(t("exportPdfError")))
                .finally(() => setExportingPdf(false));
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {exportingPdf ? t("exportingPdf") : "PDF"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {REPORT_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filters.period === p ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(`periods.${p}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filters.period === "custom" && (
              <>
                <label className="text-sm space-y-1">
                  <span className="text-slate-500">{t("filters.from")}</span>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => updateFilter("from", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-slate-500">{t("filters.to")}</span>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => updateFilter("to", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.branch")}</span>
              <select
                value={filters.branchId}
                onChange={(e) => updateFilter("branchId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{tCommon("allBranches")}</option>
                {(branches.length ? branches : user?.branches.map((b) => ({ id: b.id, name: b.name })) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.employee")}</span>
              <select
                value={filters.employeeId}
                onChange={(e) => updateFilter("employeeId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{tCommon("all")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.customer")}</span>
              <select
                value={filters.customerId}
                onChange={(e) => updateFilter("customerId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{tCommon("all")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.service")}</span>
              <select
                value={filters.serviceId}
                onChange={(e) => updateFilter("serviceId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{tCommon("all")}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.product")}</span>
              <select
                value={filters.productId}
                onChange={(e) => updateFilter("productId", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{tCommon("all")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.paymentMethod")}</span>
              <select
                value={filters.paymentMethod}
                onChange={(e) => updateFilter("paymentMethod", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">{tCommon("all")}</option>
                {REPORT_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{t(`paymentMethods.${m}`)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-slate-500">{t("filters.status")}</span>
              <select
                value={filters.status}
                onChange={(e) => updateFilter("status", e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                {REPORT_STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                ))}
              </select>
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-slate-500">{tCommon("search")}</span>
              <input
                type="search"
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {tCommon("clear")}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          {tCommon("loading")}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{t("loadError")}</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadReport()}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          {t("noData")}
        </div>
      )}

      {!loading && !error && report && !isEmpty && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {summaryCards.map((card) => (
              <Card key={card.label}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-slate-500">{card.label}</p>
                      <p className={`text-lg sm:text-2xl font-bold mt-1 ${card.tone ?? "text-slate-900"}`}>
                        {card.value}
                      </p>
                    </div>
                    <card.icon className="h-4 w-4 text-violet-600 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <h2 className="font-semibold">{t("revenueTrend")}</h2>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <p className="text-sm text-slate-400">{t("noData")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(Number(v), locale)} width={80} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v), locale)} />
                      <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">{t("salesByCategory")}</h2>
              </CardHeader>
              <CardContent>
                {categoryChartData.length === 0 ? (
                  <p className="text-sm text-slate-400">{t("noData")}</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={categoryChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                          {categoryChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v), locale)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {report.salesByCategory.map((c, idx) => (
                        <div key={c.category} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            {c.category}
                          </span>
                          <span className="font-semibold">{fmt(c.revenue)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
                        <span>{tCommon("total")}</span>
                        <span>{fmt(report.salesByCategory.reduce((sum, c) => sum + c.revenue, 0))}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ReportTable
              title={t("employeePerformance")}
              headers={[t("filters.employee"), t("totalRevenue"), t("invoices")]}
              rows={employeePage.items.map((e) => [e.employeeName, fmt(e.revenue), String(e.invoiceCount)])}
              empty={t("noEmployeeData")}
              page={tablePages.employees}
              totalPages={employeePage.totalPages}
              totalCount={employeeRows.length}
              onPageChange={(page) => setTablePages((p) => ({ ...p, employees: page }))}
            />
            <ReportTable
              title={t("paymentMethodSummary")}
              headers={[t("filters.paymentMethod"), t("invoices"), t("totalRevenue")]}
              rows={paymentPage.items.map((p) => [p.paymentMethod, String(p.invoiceCount), fmt(p.totalAmount)])}
              empty={t("noData")}
              page={tablePages.payments}
              totalPages={paymentPage.totalPages}
              totalCount={paymentRows.length}
              onPageChange={(page) => setTablePages((p) => ({ ...p, payments: page }))}
            />
            <ReportTable
              title={t("productsSoldTable")}
              headers={[t("filters.product"), t("qty"), t("totalRevenue")]}
              rows={productPage.items.map((p) => [p.productName, String(p.quantitySold), fmt(p.totalSalesAmount)])}
              empty={t("noData")}
              page={tablePages.products}
              totalPages={productPage.totalPages}
              totalCount={productRows.length}
              onPageChange={(page) => setTablePages((p) => ({ ...p, products: page }))}
              footer={`${t("productsSold")}: ${report.productsSoldCount} · ${fmt(report.productsSold.reduce((s, r) => s + r.totalSalesAmount, 0))}`}
            />
            <ReportTable
              title={t("servicesSoldTable")}
              headers={[t("filters.service"), t("qty"), t("totalRevenue")]}
              rows={servicePage.items.map((s) => [s.serviceName, String(s.timesSold), fmt(s.totalRevenue)])}
              empty={t("noData")}
              page={tablePages.services}
              totalPages={servicePage.totalPages}
              totalCount={serviceRows.length}
              onPageChange={(page) => setTablePages((p) => ({ ...p, services: page }))}
              footer={`${t("servicesSold")}: ${report.servicesSoldCount} · ${fmt(report.servicesSold.reduce((s, r) => s + r.totalRevenue, 0))}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
  empty,
  page,
  totalPages,
  totalCount,
  onPageChange,
  footer,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  empty: string;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  footer?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  {headers.map((h) => (
                    <th key={h} className="pb-2 font-medium pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row[0]}-${idx}`} className="border-b border-slate-50 last:border-0">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={`py-2 pr-3 ${cellIdx === 0 ? "" : "text-right font-medium"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {footer && <p className="text-xs text-slate-500">{footer}</p>}
        {totalPages > 1 && (
          <TablePagination
            page={page}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={onPageChange}
            onPageSizeChange={() => undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}
