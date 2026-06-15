"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SALES_PERIODS,
  type SalesFilters,
  type SalesPeriod,
} from "@/lib/sales-overview";

interface SalesGlobalFilterBarProps {
  applied: SalesFilters;
  onPeriodSelect: (period: SalesPeriod) => void;
  onReset: () => void;
  loading?: boolean;
}

export function SalesGlobalFilterBar({
  applied,
  onPeriodSelect,
  onReset,
  loading,
}: SalesGlobalFilterBarProps) {
  const t = useTranslations("sales.filters");
  const tReports = useTranslations("reports");

  const hasCustomRange = Boolean(applied.from || applied.to);
  const hasActiveFilters = hasCustomRange || applied.type.trim() || applied.entityId.trim();

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("timeRange")}</p>
            <div className="flex flex-wrap gap-1.5">
              {SALES_PERIODS.map((p) => {
                const isActive = applied.period === p && !hasCustomRange;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={loading}
                    onClick={() => onPeriodSelect(p)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                      isActive
                        ? "bg-violet-600 text-white shadow-sm ring-2 ring-violet-200"
                        : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tReports(`periods.${p}`)}
                  </button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {applied.period && !hasCustomRange && (
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                  {tReports(`periods.${applied.period}`)}
                </span>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("clearAll")}
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="h-0.5 w-full overflow-hidden rounded-b-xl bg-slate-100">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
        </div>
      )}
    </div>
  );
}
