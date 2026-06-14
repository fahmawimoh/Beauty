"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, FolderOpen, Scissors, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useApiError } from "@/lib/errors";
import { formatCurrency } from "@/lib/utils";
import type { ServiceCategory, ServiceOffering } from "@/types";

type DeleteTarget =
  | { type: "service"; item: ServiceOffering }
  | { type: "category"; item: ServiceCategory };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function ServicesPage() {
  const t = useTranslations("services");
  const tCommon = useTranslations("common");
  const getError = useApiError();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [offerings, setOfferings] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editingService, setEditingService] = useState<ServiceOffering | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [svcForm, setSvcForm] = useState({ name: "", price: "", categoryId: "", durationMinutes: "30", description: "" });
  const [editCatForm, setEditCatForm] = useState({ name: "", description: "" });
  const [editSvcForm, setEditSvcForm] = useState({ name: "", price: "", categoryId: "", durationMinutes: "30", description: "" });
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});
  const [svcErrors, setSvcErrors] = useState<Record<string, string>>({});
  const loadSeq = useRef(0);

  const loadData = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const [cats, svcs] = await Promise.all([
        api.get<ServiceCategory[]>("/services/categories"),
        api.get<ServiceOffering[]>("/services/offerings"),
      ]);
      if (seq !== loadSeq.current) return;
      setCategories(cats);
      setOfferings(svcs);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      toast("error", getError(err, tCommon("deleteFailed")));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!editingCategory) return;
    setEditCatForm({ name: editingCategory.name, description: editingCategory.description ?? "" });
    setCatErrors({});
  }, [editingCategory]);

  useEffect(() => {
    if (!editingService) return;
    setEditSvcForm({
      name: editingService.name,
      price: String(editingService.price),
      categoryId: editingService.categoryId ?? "",
      durationMinutes: String(editingService.durationMinutes),
      description: editingService.description ?? "",
    });
    setSvcErrors({});
  }, [editingService]);

  const validateCategory = (form: { name: string }) => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = t("categoryNameRequired");
    return errors;
  };

  const validateService = (form: { name: string; price: string; durationMinutes: string }) => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = t("serviceNameRequired");
    if (!form.price || Number(form.price) <= 0) errors.price = t("priceRequired");
    if (!form.durationMinutes || Number(form.durationMinutes) < 1) errors.duration = t("durationRequired");
    return errors;
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCategory(catForm);
    if (Object.keys(errors).length) { setCatErrors(errors); return; }
    setSaving(true);
    try {
      await api.post("/services/categories", { ...catForm, name: catForm.name.trim(), sortOrder: categories.length });
      setCatForm({ name: "", description: "" });
      setShowCatForm(false);
      toast("success", t("categoryCreated"));
      await loadData();
    } catch (err) {
      toast("error", getError(err));
    } finally {
      setSaving(false);
    }
  };

  const createOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateService(svcForm);
    if (Object.keys(errors).length) { setSvcErrors(errors); return; }
    setSaving(true);
    try {
      await api.post("/services/offerings", {
        name: svcForm.name.trim(),
        description: svcForm.description.trim() || null,
        price: Number(svcForm.price),
        categoryId: svcForm.categoryId || null,
        durationMinutes: Number(svcForm.durationMinutes),
      });
      setSvcForm({ name: "", price: "", categoryId: "", durationMinutes: "30", description: "" });
      setShowSvcForm(false);
      toast("success", t("serviceCreated"));
      await loadData();
    } catch (err) {
      toast("error", getError(err));
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const errors = validateCategory(editCatForm);
    if (Object.keys(errors).length) { setCatErrors(errors); return; }
    setSaving(true);
    try {
      await api.put(`/services/categories/${editingCategory.id}`, {
        name: editCatForm.name.trim(),
        description: editCatForm.description.trim() || null,
        sortOrder: editingCategory.sortOrder,
      });
      setEditingCategory(null);
      toast("success", t("categoryUpdated"));
      await loadData();
    } catch (err) {
      const msg = getError(err, t("updateFailed"));
      if (msg.toLowerCase().includes("already exists")) {
        setCatErrors({ name: t("duplicateCategoryName") });
      }
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const updateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    const errors = validateService(editSvcForm);
    if (Object.keys(errors).length) { setSvcErrors(errors); return; }
    setSaving(true);
    try {
      await api.put(`/services/offerings/${editingService.id}`, {
        name: editSvcForm.name.trim(),
        description: editSvcForm.description.trim() || null,
        price: Number(editSvcForm.price),
        categoryId: editSvcForm.categoryId || null,
        durationMinutes: Number(editSvcForm.durationMinutes),
      });
      setEditingService(null);
      toast("success", t("serviceUpdated"));
      await loadData();
    } catch (err) {
      toast("error", getError(err, t("updateFailed")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "service") {
        await api.delete(`/services/offerings/${deleteTarget.item.id}`);
        toast("success", t("serviceDeleted"));
      } else {
        if (deleteTarget.item.serviceCount > 0 && !cascadeDelete) {
          toast("warning", t("categoryDeleteBlocked"));
          return;
        }
        await api.delete(`/services/categories/${deleteTarget.item.id}${cascadeDelete ? "?cascade=true" : ""}`);
        toast("success", t("categoryDeleted"));
      }
      setDeleteTarget(null);
      setCascadeDelete(false);
      await loadData();
    } catch (err) {
      toast("error", getError(err, tCommon("deleteFailed")));
    } finally {
      setDeleting(false);
    }
  };

  const rowActions = (onEdit: () => void, onDelete: () => void) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" className="text-slate-600 hover:text-violet-700 hover:bg-violet-50" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const categoryHasServices = deleteTarget?.type === "category" && deleteTarget.item.serviceCount > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCatForm(!showCatForm)}>
            <FolderOpen className="h-4 w-4" /> {t("addCategory")}
          </Button>
          <Button onClick={() => setShowSvcForm(!showSvcForm)}>
            <Plus className="h-4 w-4" /> {t("addService")}
          </Button>
        </div>
      </div>

      {showCatForm && (
        <Card className="border-violet-100 shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-semibold text-slate-900">{t("newCategory")}</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={createCategory} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel>{t("categoryName")}</FieldLabel>
                <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
              </div>
              <div>
                <FieldLabel>{tCommon("description")}</FieldLabel>
                <Input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : tCommon("add")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCatForm(false)}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showSvcForm && (
        <Card className="border-violet-100 shadow-sm">
          <CardHeader className="pb-2">
            <h3 className="font-semibold text-slate-900">{t("newService")}</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOffering} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <FieldLabel>{t("serviceName")}</FieldLabel>
                <Input value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} required />
                <FieldError message={svcErrors.name} />
              </div>
              <div>
                <FieldLabel>{tCommon("price")}</FieldLabel>
                <Input type="number" step="0.01" min="0" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} required />
                <FieldError message={svcErrors.price} />
              </div>
              <div>
                <FieldLabel>{tCommon("category")}</FieldLabel>
                <select value={svcForm.categoryId} onChange={(e) => setSvcForm({ ...svcForm, categoryId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
                  <option value="">{t("noCategory")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>{tCommon("durationMinutes")}</FieldLabel>
                <Input type="number" min="1" value={svcForm.durationMinutes} onChange={(e) => setSvcForm({ ...svcForm, durationMinutes: e.target.value })} required />
                <FieldError message={svcErrors.duration} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>{tCommon("description")}</FieldLabel>
                <Input value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} />
              </div>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : t("addService")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowSvcForm(false)}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t("categories")}</h2>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">{categories.length}</span>
        </div>
        <DataTable
          columns={[
            { key: "name", header: tCommon("name"), sortable: true, sortValue: (r) => r.name, render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: "description", header: tCommon("description"), render: (r) => <span className="text-slate-500">{r.description || "—"}</span> },
            { key: "services", header: t("allServices"), sortable: true, sortValue: (r) => r.serviceCount, render: (r) => <span className="text-slate-600">{t("serviceCount", { count: r.serviceCount })}</span> },
          ]}
          data={categories}
          keyExtractor={(r) => r.id}
          searchPlaceholder={t("searchCategories")}
          searchFilter={(r, q) => r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false)}
          emptyMessage={tCommon("noData")}
          loading={loading}
          actionsHeader={tCommon("actions")}
          actions={(row) => rowActions(() => setEditingCategory(row), () => { setCascadeDelete(false); setDeleteTarget({ type: "category", item: row }); })}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-violet-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t("allServices")}</h2>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">{offerings.length}</span>
        </div>
        <DataTable
          columns={[
            { key: "name", header: tCommon("name"), sortable: true, sortValue: (r) => r.name, render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: "category", header: tCommon("category"), sortable: true, sortValue: (r) => r.categoryName ?? "", render: (r) => r.categoryName ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{r.categoryName}</span> : <span className="text-slate-400">{t("noCategory")}</span> },
            { key: "price", header: tCommon("price"), sortable: true, sortValue: (r) => r.price, render: (r) => <span className="font-semibold text-violet-600">{formatCurrency(r.price)}</span> },
            { key: "duration", header: tCommon("durationMinutes"), sortable: true, sortValue: (r) => r.durationMinutes, render: (r) => <span className="text-slate-500">{t("duration", { minutes: r.durationMinutes })}</span> },
          ]}
          data={offerings}
          keyExtractor={(r) => r.id}
          searchPlaceholder={t("searchServices")}
          searchFilter={(r, q) => r.name.toLowerCase().includes(q) || (r.categoryName?.toLowerCase().includes(q) ?? false)}
          emptyMessage={t("noServices")}
          loading={loading}
          actionsHeader={tCommon("actions")}
          actions={(row) => rowActions(() => setEditingService(row), () => setDeleteTarget({ type: "service", item: row }))}
        />
      </section>

      <FormDialog
        open={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title={t("editCategory")}
        subtitle={editingCategory?.name}
        onSubmit={updateCategory}
        submitLabel={saving ? tCommon("saving") : tCommon("save")}
        cancelLabel={tCommon("cancel")}
        loading={saving}
      >
        <div>
          <FieldLabel>{t("categoryName")}</FieldLabel>
          <Input value={editCatForm.name} onChange={(e) => setEditCatForm({ ...editCatForm, name: e.target.value })} autoFocus />
          <FieldError message={catErrors.name} />
        </div>
        <div>
          <FieldLabel>{tCommon("description")}</FieldLabel>
          <Input value={editCatForm.description} onChange={(e) => setEditCatForm({ ...editCatForm, description: e.target.value })} />
        </div>
      </FormDialog>

      <FormDialog
        open={!!editingService}
        onClose={() => setEditingService(null)}
        title={t("editService")}
        subtitle={editingService?.name}
        onSubmit={updateService}
        submitLabel={saving ? tCommon("saving") : tCommon("save")}
        cancelLabel={tCommon("cancel")}
        loading={saving}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel>{t("serviceName")}</FieldLabel>
            <Input value={editSvcForm.name} onChange={(e) => setEditSvcForm({ ...editSvcForm, name: e.target.value })} autoFocus />
            <FieldError message={svcErrors.name} />
          </div>
          <div>
            <FieldLabel>{tCommon("price")}</FieldLabel>
            <Input type="number" step="0.01" min="0" value={editSvcForm.price} onChange={(e) => setEditSvcForm({ ...editSvcForm, price: e.target.value })} />
            <FieldError message={svcErrors.price} />
          </div>
          <div>
            <FieldLabel>{tCommon("durationMinutes")}</FieldLabel>
            <Input type="number" min="1" value={editSvcForm.durationMinutes} onChange={(e) => setEditSvcForm({ ...editSvcForm, durationMinutes: e.target.value })} />
            <FieldError message={svcErrors.duration} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>{tCommon("category")}</FieldLabel>
            <select value={editSvcForm.categoryId} onChange={(e) => setEditSvcForm({ ...editSvcForm, categoryId: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20">
              <option value="">{t("noCategory")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>{tCommon("description")}</FieldLabel>
            <Input value={editSvcForm.description} onChange={(e) => setEditSvcForm({ ...editSvcForm, description: e.target.value })} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setCascadeDelete(false); }}
        onConfirm={handleDelete}
        title={deleteTarget?.type === "service" ? t("deleteServiceTitle") : t("deleteCategoryTitle")}
        message={
          deleteTarget?.type === "service"
            ? t("deleteServiceMessage", { name: deleteTarget.item.name })
            : t("deleteCategoryMessage", { name: deleteTarget?.item.name ?? "" })
        }
        confirmLabel={deleting ? tCommon("deleting") : tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        loading={deleting}
        confirmDisabled={!!categoryHasServices && !cascadeDelete}
        variant={categoryHasServices && !cascadeDelete ? "warning" : "danger"}
        warning={categoryHasServices ? t("categoryHasServices", { count: deleteTarget?.type === "category" ? deleteTarget.item.serviceCount : 0 }) : undefined}
      >
        {categoryHasServices && (
          <label className="mt-4 flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={cascadeDelete} onChange={(e) => setCascadeDelete(e.target.checked)} className="mt-1 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            <span className="text-sm text-slate-700">{t("deleteCategoryCascade")}</span>
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}
