"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useApiError } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import type { Product } from "@/types";

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  price: "",
  costPrice: "",
  stockQuantity: "",
  lowStockThreshold: "5",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function ProductsPage() {
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const getError = useApiError();
  const { user } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const loadSeq = useRef(0);

  const canManage = user?.role === "Admin" || user?.role === "Manager";
  const branchQuery = user?.branchId ? `branchId=${user.branchId}&` : "";

  const load = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const [all, low] = await Promise.all([
        api.get<{ items: Product[] }>(`/products?${branchQuery}pageSize=100`),
        api.get<Product[]>(`/products/low-stock${user?.branchId ? `?branchId=${user.branchId}` : ""}`),
      ]);
      if (seq !== loadSeq.current) return;
      setProducts(all.items);
      setLowStock(low);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      toast("error", getError(err));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.branchId]);

  useEffect(() => {
    if (!editingProduct) return;
    setEditForm({
      sku: editingProduct.sku,
      name: editingProduct.name,
      description: editingProduct.description ?? "",
      price: String(editingProduct.price),
      costPrice: String(editingProduct.costPrice),
      stockQuantity: String(editingProduct.stockQuantity),
      lowStockThreshold: String(editingProduct.lowStockThreshold),
    });
    setEditErrors({});
  }, [editingProduct]);

  const validateForm = (data: typeof emptyForm) => {
    const errors: Record<string, string> = {};
    if (!data.sku.trim()) errors.sku = t("skuRequired");
    if (!data.name.trim()) errors.name = t("nameRequired");
    if (!data.price || Number(data.price) < 0) errors.price = t("priceRequired");
    if (!data.costPrice || Number(data.costPrice) < 0) errors.costPrice = t("costRequired");
    if (data.stockQuantity === "" || Number(data.stockQuantity) < 0) errors.stockQuantity = t("stockRequired");
    if (data.lowStockThreshold === "" || Number(data.lowStockThreshold) < 0) errors.lowStockThreshold = t("stockRequired");
    return errors;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    try {
      await api.post("/products", {
        branchId: user?.branchId || null,
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        costPrice: Number(form.costPrice),
        stockQuantity: Number(form.stockQuantity),
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      setForm(emptyForm);
      setFormErrors({});
      setShowForm(false);
      toast("success", t("productCreated"));
      await load();
    } catch (err) {
      const msg = getError(err, t("createFailed"));
      if (msg.toLowerCase().includes("sku")) setFormErrors({ sku: t("duplicateSku") });
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const errors = validateForm(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/products/${editingProduct.id}`, {
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        price: Number(editForm.price),
        costPrice: Number(editForm.costPrice),
        stockQuantity: Number(editForm.stockQuantity),
        lowStockThreshold: Number(editForm.lowStockThreshold),
        isActive: true,
      });
      setEditingProduct(null);
      toast("success", t("productUpdated"));
      await load();
    } catch (err) {
      const msg = getError(err, t("updateFailed"));
      if (msg.toLowerCase().includes("sku")) setEditErrors({ sku: t("duplicateSku") });
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast("success", t("productDeleted"));
      await load();
    } catch (err) {
      toast("error", getError(err, tCommon("deleteFailed")));
    } finally {
      setDeleting(false);
    }
  };

  const productFormFields = (
    data: typeof emptyForm,
    setData: (v: typeof emptyForm) => void,
    errors: Record<string, string>
  ) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <FieldLabel>{t("sku")}</FieldLabel>
        <Input value={data.sku} onChange={(e) => setData({ ...data, sku: e.target.value })} autoFocus />
        <FieldError message={errors.sku} />
      </div>
      <div>
        <FieldLabel>{t("productName")}</FieldLabel>
        <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        <FieldError message={errors.name} />
      </div>
      <div>
        <FieldLabel>{tCommon("price")}</FieldLabel>
        <Input type="number" step="0.01" min="0" value={data.price} onChange={(e) => setData({ ...data, price: e.target.value })} />
        <FieldError message={errors.price} />
      </div>
      <div>
        <FieldLabel>{t("costPrice")}</FieldLabel>
        <Input type="number" step="0.01" min="0" value={data.costPrice} onChange={(e) => setData({ ...data, costPrice: e.target.value })} />
        <FieldError message={errors.costPrice} />
      </div>
      <div>
        <FieldLabel>{t("stockQuantity")}</FieldLabel>
        <Input type="number" min="0" value={data.stockQuantity} onChange={(e) => setData({ ...data, stockQuantity: e.target.value })} />
        <FieldError message={errors.stockQuantity} />
      </div>
      <div>
        <FieldLabel>{t("lowStockThreshold")}</FieldLabel>
        <Input type="number" min="0" value={data.lowStockThreshold} onChange={(e) => setData({ ...data, lowStockThreshold: e.target.value })} />
        <FieldError message={errors.lowStockThreshold} />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>{tCommon("description")}</FieldLabel>
        <Input value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} />
      </div>
    </div>
  );

  const rowActions = (product: Product) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-600 hover:text-violet-700 hover:bg-violet-50"
        onClick={() => setEditingProduct(product)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setDeleteTarget(product)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> {t("addProduct")}
          </Button>
        )}
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">{t("lowStockWarning", { count: lowStock.length })}</p>
        </div>
      )}

      {showForm && canManage && (
        <Card className="border-violet-100 shadow-sm">
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-4">
              {productFormFields(form, setForm, formErrors)}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : t("saveProduct")}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormErrors({}); }}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={[
          { key: "sku", header: t("sku"), sortable: true, sortValue: (r) => r.sku, render: (r) => <span className="font-mono text-xs text-slate-600">{r.sku}</span> },
          { key: "name", header: tCommon("name"), sortable: true, sortValue: (r) => r.name, render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
          { key: "price", header: tCommon("price"), sortable: true, sortValue: (r) => r.price, render: (r) => formatCurrency(r.price) },
          { key: "cost", header: t("cost"), sortable: true, sortValue: (r) => r.costPrice, render: (r) => <span className="text-slate-500">{formatCurrency(r.costPrice)}</span> },
          { key: "stock", header: tCommon("stock"), sortable: true, sortValue: (r) => r.stockQuantity, render: (r) => (
            <span className={r.isLowStock ? "text-amber-600 font-medium" : ""}>{r.stockQuantity}</span>
          )},
          { key: "status", header: tCommon("status"), sortable: true, sortValue: (r) => (r.isLowStock ? 0 : 1), render: (r) => (
            r.isLowStock ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                <AlertTriangle className="h-3 w-3" /> {t("low")}
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{t("inStock")}</span>
            )
          )},
        ]}
        data={products}
        keyExtractor={(r) => r.id}
        searchPlaceholder={t("searchProducts")}
        searchFilter={(r, q) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)}
        emptyMessage={tCommon("noData")}
        loading={loading}
        actionsHeader={canManage ? tCommon("actions") : undefined}
        actions={canManage ? rowActions : undefined}
      />

      <FormDialog
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title={t("editProduct")}
        subtitle={editingProduct?.name}
        onSubmit={handleUpdate}
        submitLabel={saving ? tCommon("saving") : tCommon("save")}
        cancelLabel={tCommon("cancel")}
        loading={saving}
        size="lg"
      >
        {productFormFields(editForm, setEditForm, editErrors)}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("deleteProductTitle")}
        message={t("deleteProductMessage")}
        confirmLabel={deleting ? tCommon("deleting") : t("confirmDelete")}
        cancelLabel={tCommon("cancel")}
        loading={deleting}
      />
    </div>
  );
}
