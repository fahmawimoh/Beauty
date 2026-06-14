"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface PeriodReport {
  period: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalDiscounts: number;
  invoiceCount: number;
  customerCount: number;
  averageInvoiceValue: number;
  salesByCategory: { category: string; revenue: number; count: number }[];
  salesByEmployee: { employeeId: string; employeeName: string; revenue: number; invoiceCount: number }[];
}

const periods = ["daily", "weekly", "monthly", "yearly"] as const;

export default function ReportsPage() {
  const t = useTranslations("reports");
  const tEmployees = useTranslations("employees");
  const locale = useLocale();
  const fmt = (amount: number) => formatCurrency(amount, locale);
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<(typeof periods)[number]>("monthly");
  const [report, setReport] = useState<PeriodReport | null>(null);

  useEffect(() => {
    const branchParam = user?.branchId ? `?branchId=${user.branchId}` : "";
    api.get<PeriodReport>(`/reports/period/${period}${branchParam}`).then(setReport).catch(console.error);
  }, [period, user?.branchId]);

  const stats = report
    ? [
        { label: t("revenue"), value: fmt(report.totalRevenue), color: "text-violet-600" },
        { label: t("expenses"), value: fmt(report.totalExpenses), color: "text-red-500" },
        { label: t("netProfit"), value: fmt(report.netProfit), color: report.netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
        { label: t("totalDiscounts"), value: fmt(report.totalDiscounts), color: "text-amber-600" },
        { label: t("avgInvoice"), value: fmt(report.averageInvoiceValue), color: "text-slate-900" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {periods.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${period === p ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {t(`periods.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><h2 className="font-semibold">{t("salesByCategory")}</h2></CardHeader>
              <CardContent>
                {report.salesByCategory.length === 0 ? (
                  <p className="text-sm text-slate-400">{t("noData")}</p>
                ) : report.salesByCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm">{c.category}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmt(c.revenue)}</p>
                      <p className="text-xs text-slate-400">{t("items", { count: c.count })}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><h2 className="font-semibold">{t("employeePerformance")}</h2></CardHeader>
              <CardContent>
                {report.salesByEmployee.length === 0 ? (
                  <p className="text-sm text-slate-400">{t("noEmployeeData")}</p>
                ) : report.salesByEmployee.map((e) => (
                  <div key={e.employeeId} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-medium">{e.employeeName}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmt(e.revenue)}</p>
                      <p className="text-xs text-slate-400">{e.invoiceCount} {tEmployees("invoices").toLowerCase()}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
