"use client";

import { useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DiscountFieldLabel, DiscountInput } from "@/components/ui/discount-input";
import { formatDiscountDisplay, type DiscountType } from "@/lib/discount";
import type { CartItem, Customer } from "@/types";

interface SaleConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cart: CartItem[];
  customer: Customer | null;
  discountType: DiscountType;
  discountValue: number;
  onDiscountChange: (value: number) => void;
  subtotal: number;
  discountAmount: number;
  total: number;
  fmt: (amount: number) => string;
  loading?: boolean;
  discountValid: boolean;
}

export function SaleConfirmDialog({
  open,
  onClose,
  onConfirm,
  cart,
  customer,
  discountType,
  discountValue,
  onDiscountChange,
  subtotal,
  discountAmount,
  total,
  fmt,
  loading = false,
  discountValid,
}: SaleConfirmDialogProps) {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onClose={onClose} title={t("confirmSaleTitle")} size="md">
      <p className="mt-1 text-sm text-slate-500">{t("confirmSaleMessage")}</p>

      {customer && (
        <div className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm">
          <span className="text-slate-500">{t("confirmCustomer")}: </span>
          <span className="font-medium text-violet-900">{customer.name}</span>
        </div>
      )}

      <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
        {cart.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900 truncate">{item.name}</p>
              <p className="text-xs text-slate-400">
                {fmt(item.unitPrice)} × {item.quantity}
              </p>
            </div>
            <span className="shrink-0 font-medium">{fmt(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{tCommon("subtotal")}</span>
          <span className="font-medium">{fmt(subtotal)}</span>
        </div>
        <div className="flex items-center gap-2">
          <DiscountFieldLabel discountType={discountType} className="text-xs" />
          <DiscountInput
            discountType={discountType}
            value={discountValue}
            subtotal={subtotal}
            onChange={onDiscountChange}
          />
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span>{tCommon("discount")}</span>
            <span>{formatDiscountDisplay(discountType, discountValue, discountAmount, fmt)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
          <span className="font-semibold text-slate-900">{t("payableAmount")}</span>
          <span className="text-xl font-bold text-violet-600">{fmt(total)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button type="button" variant="outline" className="sm:min-w-28" onClick={onClose} disabled={loading}>
          {tCommon("cancel")}
        </Button>
        <Button
          type="button"
          className="sm:min-w-36"
          onClick={onConfirm}
          disabled={loading || !discountValid || cart.length === 0}
        >
          <ShoppingBag className="h-4 w-4" />
          {loading ? t("processing") : t("confirmSale")}
        </Button>
      </div>
    </Dialog>
  );
}
