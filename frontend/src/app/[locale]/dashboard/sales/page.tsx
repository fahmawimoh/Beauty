"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Banknote, Percent, TrendingUp, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { formatDiscountDisplay, normalizeDiscountType } from "@/lib/discount";
import {
  hasTruncatedResults,
  normalizeSalesPeriod,
  SALES_PERIODS,
  type SalesOverview,
  type SalesPeriod,
  type SalesRow,
} from "@/lib/sales-overview";
import { useAuthStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import type { Invoice } from "@/types";

export default function SalesPage() {
  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const locale = useLocale();
  const fmt = (amount: number) => formatCurrency(amount, locale);
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<SalesPeriod>("daily");
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    const branchParam = user?.branchId ? `&branchId=${user.branchId}` : "";
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SalesOverview>(`/reports/sales?period=${period}${branchParam}`);
      setOverview(data);
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [period, user?.branchId, t]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

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
  const current = overview?.current;
  const periodSummaries = overview
    ? [
        { key: "daily" as const, label: tReports("periods.daily"), summary: overview.daily },
        { key: "weekly" as const, label: tReports("periods.weekly"), summary: overview.weekly },
        { key: "monthly" as const, label: tReports("periods.monthly"), summary: overview.monthly },
      ]
    : [];

  const stats = current
    ? [
        { label: t("totalSales"), value: fmt(current.totalSales), color: "text-violet-600", icon: Banknote },
        { label: t("appliedDiscounts"), value: fmt(current.totalDiscounts), color: "text-amber-600", icon: Percent },
        { label: t("netRevenue"), value: fmt(current.netRevenue), color: "text-emerald-600", icon: TrendingUp },
      ]
    : [];

  const truncated = overview
    ? hasTruncatedResults(overview.totalSalesCount, overview.sales.length)
    : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {SALES_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(normalizeSalesPeriod(p))}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tReports(`periods.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => void loadOverview()} className="font-medium underline">
            {t("retry")}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-slate-400 py-12">{tCommon("loading")}</p>
      ) : overview ? (
        <>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {periodSummaries.map(({ key, label, summary }) => (
                  <div
                    key={key}
                    className={`rounded-lg border p-4 ${
                      period === key ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-600">{label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{fmt(summary.netRevenue)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t("salesAndDiscounts", {
                        sales: fmt(summary.totalSales),
                        discounts: fmt(summary.totalDiscounts),
                      })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t("invoiceCount", { count: summary.invoiceCount })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">{t("productSalesTable")}</h2>
                <p className="text-xs text-slate-400 mt-1">{t("productSalesSubtitle")}</p>
              </div>
              {overview.productSales && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">{t("productGrandTotal")}</p>
                    <p className="font-bold text-violet-600">{fmt(overview.productSales.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t("productQuantityTotal")}</p>
                    <p className="font-bold text-slate-900">{overview.productSales.totalQuantitySold}</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {!overview.productSales || overview.productSales.products.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-400">{t("noProductSales")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-start text-slate-500">
                        <th className="px-4 py-3 font-medium">{tCommon("name")}</th>
                        <th className="px-4 py-3 font-medium">{t("productType")}</th>
                        <th className="px-4 py-3 font-medium">{t("productCategory")}</th>
                        <th className="px-4 py-3 font-medium text-end">{t("quantitySold")}</th>
                        <th className="px-4 py-3 font-medium text-end">{t("productSalesAmount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.productSales.products.map((product) => (
                        <tr
                          key={product.productId ?? product.productName}
                          className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">{product.productName}</td>
                          <td className="px-4 py-3 text-slate-600">{product.productType}</td>
                          <td className="px-4 py-3 text-slate-600">{product.productCategory}</td>
                          <td className="px-4 py-3 text-end">{product.quantitySold}</td>
                          <td className="px-4 py-3 text-end font-semibold">{fmt(product.totalSalesAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                        <td className="px-4 py-3" colSpan={3}>{t("productGrandTotal")}</td>
                        <td className="px-4 py-3 text-end">{overview.productSales.totalQuantitySold}</td>
                        <td className="px-4 py-3 text-end text-violet-700">{fmt(overview.productSales.grandTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">{t("salesTable")}</h2>
                {overview.startDate && overview.endDate && (
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(overview.startDate).toLocaleDateString(dateLocale)} –{" "}
                    {new Date(overview.endDate).toLocaleDateString(dateLocale)}
                  </p>
                )}
              </div>
              {truncated && (
                <p className="text-xs text-amber-600">
                  {t("truncated", { shown: overview.sales.length, total: overview.totalSalesCount })}
                </p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {overview.sales.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-400">{t("noSales")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-start text-slate-500">
                        <th className="px-4 py-3 font-medium">{t("invoiceNumber")}</th>
                        <th className="px-4 py-3 font-medium">{tCommon("date")}</th>
                        <th className="px-4 py-3 font-medium">{t("customer")}</th>
                        <th className="px-4 py-3 font-medium text-end">{tCommon("subtotal")}</th>
                        <th className="px-4 py-3 font-medium text-end">{tCommon("discount")}</th>
                        <th className="px-4 py-3 font-medium text-end">{tCommon("total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.sales.map((invoice) => (
                        <tr
                          key={invoice.id}
                          onClick={() => void openSaleDetails(invoice)}
                          className="border-b border-slate-50 hover:bg-violet-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-violet-700">{invoice.invoiceNumber}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(invoice.createdAt).toLocaleString(dateLocale)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{invoice.customerName || "—"}</td>
                          <td className="px-4 py-3 text-end">{fmt(invoice.subTotal)}</td>
                          <td className="px-4 py-3 text-end text-emerald-600">
                            {invoice.discountAmount > 0 ? fmt(invoice.discountAmount) : "—"}
                          </td>
                          <td className="px-4 py-3 text-end font-semibold">{fmt(invoice.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : !error ? (
        <p className="text-center text-sm text-slate-400 py-12">{t("noSales")}</p>
      ) : null}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t("saleDetails")}
        size="lg"
      >
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
                      {fmt(item.unitPrice)} × {item.quantity}
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
