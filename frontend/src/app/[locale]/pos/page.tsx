"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Search, Plus, Minus, Trash2, User, Scissors, Package, CreditCard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore, usePosStore, useSettingsStore } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import { useApiError } from "@/lib/errors";
import { formatDiscountDisplay, validateDiscountValue } from "@/lib/discount";
import { DiscountFieldLabel, DiscountInput } from "@/components/ui/discount-input";
import type { Customer, ServiceCategory, ServiceOffering, Product, Receipt } from "@/types";

type Tab = "services" | "products";

export default function PosPage() {
  const t = useTranslations("pos");
  const tCommon = useTranslations("common");
  const tReceipt = useTranslations("receipt");
  const locale = useLocale();
  const fmt = (amount: number) => formatCurrency(amount, locale);
  const getError = useApiError();
  const { user } = useAuthStore();
  const { discountType } = useSettingsStore();
  const {
    cart,
    selectedCustomer,
    discountValue,
    addToCart,
    removeFromCart,
    updateQuantity,
    setCustomer,
    setDiscountValue,
    clearCart,
    subtotal,
    discountAmount,
    total,
  } = usePosStore();

  const [tab, setTab] = useState<Tab>("services");
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");

  useEffect(() => {
    api.get<ServiceCategory[]>("/services/categories").then(setCategories).catch(console.error);
    api.get<ServiceOffering[]>("/services/offerings").then(setServices).catch(console.error);
    const branchParam = user?.branchId ? `?branchId=${user.branchId}` : "";
    api.get<{ items: Product[] }>(`/products${branchParam}&pageSize=100`).then((r) => setProducts(r.items)).catch(console.error);
  }, [user?.branchId]);

  const filteredServices = services.filter((s) => {
    const matchCat = !selectedCategory || s.categoryId === selectedCategory;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredProducts = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const searchCustomers = useCallback(async (q: string) => {
    if (!q) { setCustomers([]); return; }
    const result = await api.get<{ items: Customer[] }>(`/customers?search=${encodeURIComponent(q)}&pageSize=5`);
    setCustomers(result.items);
  }, []);

  const sub = subtotal();
  const discountValidationError = validateDiscountValue(discountType, discountValue, sub);
  const cartDiscountError = cart.some(
    (item) => validateDiscountValue(discountType, item.discountValue, item.unitPrice * item.quantity) !== null
  );
  const hasDiscountError = !!discountValidationError || cartDiscountError;

  const handleCheckout = async () => {
    if (!user?.branchId || cart.length === 0 || hasDiscountError) return;

    setProcessing(true);
    try {
      const invoice = await api.post<{ id: string }>("/invoices", {
        branchId: user.branchId,
        customerId: selectedCustomer?.id || null,
        discountValue,
        taxAmount: 0,
        items: cart.map((item) => ({
          itemType: item.itemType === "Service" ? 1 : 2,
          serviceOfferingId: item.serviceOfferingId || null,
          productId: item.productId || null,
          employeeId: item.employeeId || null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountValue: item.discountValue,
        })),
      });
      const receiptData = await api.get<Receipt>(`/invoices/${invoice.id}/receipt`);
      setReceipt(receiptData);
      clearCart();
    } catch (err) {
      alert(getError(err, t("checkoutFailed")));
    } finally {
      setProcessing(false);
    }
  };

  const quickAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    const customer = await api.post<Customer>("/customers", { name: newCustomerName.trim(), phone: "500000000" });
    setCustomer(customer);
    setNewCustomerName("");
    setShowCustomerSearch(false);
  };

  const printReceipt = () => {
    if (!receipt) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const dir = locale === "ar" ? "rtl" : "ltr";
    const dateLocale = locale === "ar" ? "ar-SA" : "en-US";
    win.document.write(`<html dir="${dir}"><head><title>${tReceipt("invoice")} ${receipt.invoiceNumber}</title>
      <style>body{font-family:monospace;font-size:12px;max-width:300px;margin:20px auto;direction:${dir}}
      .center{text-align:center}.line{border-top:1px dashed #000;margin:8px 0}
      table{width:100%}td:last-child{text-align:${dir === "rtl" ? "left" : "right"}}</style></head><body>
      <div class="center"><b>${receipt.businessName}</b><br>${receipt.branchName}</div>
      <div class="line"></div>
      <div>${tReceipt("invoice")}: ${receipt.invoiceNumber}<br>${tCommon("date")}: ${new Date(receipt.date).toLocaleString(dateLocale)}<br>
      ${tReceipt("cashier")}: ${receipt.cashierName}${receipt.customerName ? `<br>${tReceipt("customer")}: ${receipt.customerName}` : ""}</div>
      <div class="line"></div>
      <table>${receipt.items.map((i) => `<tr><td>${i.name} x${i.quantity}</td><td>${fmt(i.lineTotal)}</td></tr>`).join("")}</table>
      <div class="line"></div>
      <table><tr><td>${tCommon("subtotal")}</td><td>${fmt(receipt.subTotal)}</td></tr>
      ${receipt.discountAmount > 0 ? `<tr><td>${tCommon("discount")}</td><td>${formatDiscountDisplay(receipt.discountType, receipt.discountValue, receipt.discountAmount, fmt)}</td></tr>` : ""}
      <tr><td><b>${tCommon("total")}</b></td><td><b>${fmt(receipt.total)}</b></td></tr></table>
      <div class="line"></div><div class="center">${tCommon("thankYou")}</div></body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] gap-4 -m-6 p-4">
      <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 p-3">
          <button onClick={() => setTab("services")} className={cn("flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors", tab === "services" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100")}>
            <Scissors className="h-4 w-4" /> {t("services")}
          </button>
          <button onClick={() => setTab("products")} className={cn("flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors", tab === "products" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100")}>
            <Package className="h-4 w-4" /> {t("products")}
          </button>
          <div className="ms-auto relative flex-1 max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="ps-9" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {tab === "services" && categories.length > 0 && (
          <div className="flex gap-2 p-3 border-b border-slate-100 overflow-x-auto">
            <button onClick={() => setSelectedCategory(null)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", !selectedCategory ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600")}>{tCommon("all")}</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", selectedCategory === c.id ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600")}>{c.name}</button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
          {tab === "services" ? filteredServices.map((s) => (
            <button key={s.id} onClick={() => addToCart({ itemType: "Service", serviceOfferingId: s.id, name: s.name, unitPrice: s.price })}
              className="flex flex-col items-start rounded-xl border border-slate-200 p-3 text-start hover:border-violet-400 hover:bg-violet-50 active:scale-95 transition-all">
              <span className="text-sm font-medium text-slate-900 line-clamp-2">{s.name}</span>
              {s.categoryName && <span className="text-xs text-slate-400 mt-0.5">{s.categoryName}</span>}
              <span className="mt-auto pt-2 text-sm font-bold text-violet-600">{fmt(s.price)}</span>
            </button>
          )) : filteredProducts.map((p) => (
            <button key={p.id} onClick={() => addToCart({ itemType: "Product", productId: p.id, name: p.name, unitPrice: p.price })}
              className={cn("flex flex-col items-start rounded-xl border p-3 text-start hover:border-violet-400 hover:bg-violet-50 active:scale-95 transition-all", p.isLowStock ? "border-amber-300" : "border-slate-200")}>
              <span className="text-sm font-medium text-slate-900 line-clamp-2">{p.name}</span>
              <span className="text-xs text-slate-400">{t("stock", { count: p.stockQuantity })}</span>
              <span className="mt-auto pt-2 text-sm font-bold text-violet-600">{fmt(p.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-80 lg:w-96 flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0">
        <div className="border-b border-slate-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-900">{t("currentSale")}</h2>
            {cart.length > 0 && <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600">{tCommon("clear")}</button>}
          </div>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-900">{selectedCustomer.name}</span>
              </div>
              <button onClick={() => setCustomer(null)} className="text-xs text-violet-500">{tCommon("remove")}</button>
            </div>
          ) : (
            <button onClick={() => setShowCustomerSearch(!showCustomerSearch)} className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-violet-400 hover:text-violet-600">
              <User className="h-4 w-4" /> {t("addCustomer")}
            </button>
          )}
          {showCustomerSearch && (
            <div className="mt-2 space-y-2">
              <Input placeholder={t("searchCustomer")} value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); searchCustomers(e.target.value); }} autoFocus />
              {customers.map((c) => (
                <button key={c.id} onClick={() => { setCustomer(c); setShowCustomerSearch(false); setCustomerSearch(""); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                  <span>{c.name}</span>
                  {c.phone && <span className="text-xs text-slate-400" dir="ltr">{c.phone}</span>}
                </button>
              ))}
              <div className="flex gap-2">
                <Input placeholder={t("newCustomerName")} value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                <Button size="sm" onClick={quickAddCustomer}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">{t("tapToAdd")}</p>
          ) : cart.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">{fmt(item.unitPrice)} {t("each")}</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-md border border-slate-200 p-0.5 hover:bg-slate-50"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-md border border-slate-200 p-0.5 hover:bg-slate-50"><Plus className="h-3 w-3" /></button>
                </div>
                <span className="text-sm font-semibold">{fmt(item.unitPrice * item.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{tCommon("subtotal")}</span>
            <span>{fmt(subtotal())}</span>
          </div>
          <div className="flex items-start gap-2">
            <DiscountFieldLabel discountType={discountType} />
            <DiscountInput
              discountType={discountType}
              value={discountValue}
              subtotal={subtotal()}
              onChange={setDiscountValue}
            />
          </div>
          {discountValue > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">{tCommon("discount")}</span>
              <span className="text-emerald-600">-{fmt(discountAmount())}</span>
            </div>
          )}
          <p className="text-xs text-slate-400">{t("discountModeHint", { mode: discountType === "PERCENTAGE" ? t("modePercentage") : t("modeFixed") })}</p>
          <div className="flex items-center justify-between font-bold text-lg pt-1">
            <span>{tCommon("total")}</span>
            <span className="text-violet-600">{fmt(total())}</span>
          </div>
          <Button className="w-full" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || processing || hasDiscountError}>
            <CreditCard className="h-4 w-4" />
            {processing ? t("processing") : t("completeSale")}
          </Button>
        </div>
      </div>

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-center mb-4">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CreditCard className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold">{t("saleComplete")}</h3>
              <p className="text-sm text-slate-500">{receipt.invoiceNumber}</p>
            </div>
            <p className="text-center text-3xl font-bold text-violet-600 mb-4">{fmt(receipt.total)}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={printReceipt}><Printer className="h-4 w-4" /> {tCommon("print")}</Button>
              <Button className="flex-1" onClick={() => setReceipt(null)}>{tCommon("done")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
