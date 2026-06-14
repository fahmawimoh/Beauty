"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Employee } from "@/types";

interface EmployeePerformanceDto {
  employeeId: string;
  employeeName: string;
  invoiceCount: number;
  totalSales: number;
  averageSale: number;
}

export default function EmployeesPage() {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [performance, setPerformance] = useState<EmployeePerformanceDto[]>([]);

  useEffect(() => {
    api.get<Employee[]>("/employees").then(setEmployees).catch(() => {});
    api.get<EmployeePerformanceDto[]>("/employees/performance").then(setPerformance).catch(() => {});
  }, []);

  const perfMap = Object.fromEntries(performance.map((p) => [p.employeeId, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => {
          const perf = perfMap[emp.id];
          return (
            <div key={emp.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-bold text-sm">
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div>
                  <h3 className="font-semibold">{emp.fullName}</h3>
                  <p className="text-xs text-slate-500">{tRoles(emp.role as "Admin" | "Manager" | "Cashier")}</p>
                </div>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {emp.isActive ? tCommon("active") : tCommon("inactive")}
                </span>
              </div>
              {perf && (
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-100 pt-3">
                  <div><p className="text-slate-400 text-xs">{t("sales")}</p><p className="font-semibold">{formatCurrency(perf.totalSales)}</p></div>
                  <div><p className="text-slate-400 text-xs">{t("invoices")}</p><p className="font-semibold">{perf.invoiceCount}</p></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {employees.length === 0 && <p className="text-center py-12 text-slate-400">{t("noEmployees")}</p>}
    </div>
  );
}
