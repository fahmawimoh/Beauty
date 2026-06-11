"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const branchParam = user?.branchId ? `?branchId=${user.branchId}` : "";
    api.get<DashboardSummary>(`/reports/dashboard${branchParam}`).then(setData).catch(console.error);
  }, [user?.branchId]);

  const chartData = data?.last7DaysSales.map((d) => ({
    day: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
    revenue: d.revenue,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Business overview for {user?.branchName || "all branches"}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={data?.todayRevenue ?? 0} icon={DollarSign} />
        <StatCard title="Today's Customers" value={data?.todayCustomers ?? 0} icon={Users} />
        <StatCard title="Today's Invoices" value={data?.todayInvoices ?? 0} icon={Receipt} />
        <StatCard title="Today's Profit" value={data?.todayProfit ?? 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard title="Week Revenue" value={data?.weekRevenue ?? 0} icon={DollarSign} className="lg:col-span-1" />
        <StatCard title="Month Revenue" value={data?.monthRevenue ?? 0} icon={DollarSign} className="lg:col-span-1" />
        <StatCard title="Year Revenue" value={data?.yearRevenue ?? 0} icon={DollarSign} className="lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-slate-900">Revenue — Last 7 Days</h2>
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
            <h2 className="font-semibold text-slate-900">Alerts</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.lowStockCount ?? 0) > 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">{data?.lowStockCount} low stock items</p>
                  <p className="text-xs text-amber-600">Review inventory soon</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <Package className="h-5 w-5 text-emerald-500" />
                <p className="text-sm text-emerald-700">Inventory levels are healthy</p>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Today&apos;s Expenses</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(data?.todayExpenses ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
