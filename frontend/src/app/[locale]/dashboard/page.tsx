"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { DollarSign, Users, Receipt, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import type { DashboardSummary } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const { user } = useAuthStore();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  useEffect(() => {
    const branchParam = user?.branchId ? `?branchId=${user.branchId}` : "";
    api.get<DashboardSummary>(`/reports/dashboard${branchParam}`).then(setData).catch(console.error);
  }, [user?.branchId]);

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";
  const chartData = data?.last7DaysSales.map((d) => ({
    day: new Date(d.date).toLocaleDateString(dateLocale, { weekday: "short" }),
    revenue: d.revenue,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("subtitle", { branch: user?.branchName || tCommon("allBranches") })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t("todayRevenue")} value={data?.todayRevenue ?? 0} icon={DollarSign} />
        <StatCard title={t("todayCustomers")} value={data?.todayCustomers ?? 0} icon={Users} />
        <StatCard title={t("todayInvoices")} value={data?.todayInvoices ?? 0} icon={Receipt} />
        <StatCard title={t("todayProfit")} value={data?.todayProfit ?? 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard title={t("weekRevenue")} value={data?.weekRevenue ?? 0} icon={DollarSign} className="lg:col-span-1" />
        <StatCard title={t("monthRevenue")} value={data?.monthRevenue ?? 0} icon={DollarSign} className="lg:col-span-1" />
        <StatCard title={t("yearRevenue")} value={data?.yearRevenue ?? 0} icon={DollarSign} className="lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-slate-900">{t("revenueChart")}</h2>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-900">{t("alerts")}</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.lowStockCount ?? 0) > 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{t("lowStockAlert", { count: data?.lowStockCount ?? 0 })}</p>
                  <p className="text-xs text-amber-600">{t("lowStockHint")}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <Package className="h-5 w-5 text-emerald-500" />
                <p className="text-sm text-emerald-700">{t("inventoryHealthy")}</p>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{t("todayExpenses")}</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(data?.todayExpenses ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
