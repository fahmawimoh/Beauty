"use client";

import { useTranslations } from "next-intl";
import { SALES_PAGE_SIZE_OPTIONS } from "@/lib/sales-overview";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

export function TablePagination({
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: TablePaginationProps) {
  const t = useTranslations("sales");
  const safeTotalPages = Math.max(totalPages, 1);
  const canPrev = page > 1 && !disabled;
  const canNext = totalPages > 0 && page < totalPages && !disabled;

  const pageOptions = Array.from({ length: safeTotalPages }, (_, i) => i + 1);

  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>{t("pageInfo", { page, totalPages: safeTotalPages })}</span>
        <label className="flex items-center gap-2">
          <span className="sr-only">{t("itemsPerPage")}</span>
          <select
            value={pageSize}
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 disabled:opacity-50"
          >
            {SALES_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {t("perPage", { count: size })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("previous")}
        </button>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="hidden sm:inline">{t("goToPage")}</span>
          <select
            value={page}
            disabled={disabled || safeTotalPages <= 1}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm disabled:opacity-50"
          >
            {pageOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
