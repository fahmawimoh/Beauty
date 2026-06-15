"use client";

import { useTranslations } from "next-intl";
import { Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDiscountDisplay, normalizeDiscountType } from "@/lib/discount";
import type { Receipt } from "@/types";

interface SaleSuccessDialogProps {
  receipt: Receipt;
  fmt: (amount: number) => string;
  onClose: () => void;
  onPrint: () => void;
}

export function SaleSuccessDialog({ receipt, fmt, onClose, onPrint }: SaleSuccessDialogProps) {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");
  const discountType = normalizeDiscountType(receipt.discountType);
  const hasDiscount = receipt.discountAmount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-success-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" aria-hidden />
          </div>
          <h3 id="sale-success-title" className="text-xl font-bold text-slate-900">
            {t("saleCompleteSuccess")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{receipt.invoiceNumber}</p>
        </div>

        <div className="mt-5 space-y-2.5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{tCommon("subtotal")}</span>
            <span className="font-medium text-slate-900">{fmt(receipt.subTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{tCommon("discount")}</span>
            <span className={hasDiscount ? "font-medium text-emerald-600" : "text-slate-400"}>
              {hasDiscount
                ? formatDiscountDisplay(discountType, receipt.discountValue ?? 0, receipt.discountAmount, fmt)
                : fmt(0)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-violet-50 px-4 py-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
            {t("finalTotalAfterDiscount")}
          </p>
          <p className="mt-1 text-3xl font-bold text-violet-700 sm:text-4xl">{fmt(receipt.total)}</p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onPrint}>
            <Printer className="h-4 w-4" />
            {tCommon("print")}
          </Button>
          <Button className="flex-1" onClick={onClose}>
            {tCommon("ok")}
          </Button>
        </div>
      </div>
    </div>
  );
}
