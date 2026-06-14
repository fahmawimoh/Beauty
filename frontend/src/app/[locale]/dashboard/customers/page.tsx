"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { usePhoneValidation, formatPhoneDisplay, isPhoneValidationMessage, resolvePhoneApiError } from "@/lib/phone";
import { useApiError } from "@/lib/errors";
import { useAuthStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Customer } from "@/types";

type CustomerForm = { name: string; phone: string; email: string; notes: string };

const emptyForm = (): CustomerForm => ({ name: "", phone: "", email: "", notes: "" });

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuthStore();
  const tValidation = useTranslations("validation");
  const { validatePhone, validatePhoneUnique, normalizePhone } = usePhoneValidation();
  const getError = useApiError();

  const canManage = user?.role === "Admin" || user?.role === "Manager";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () =>
    api.get<{ items: Customer[] }>(`/customers?search=${encodeURIComponent(search)}&pageSize=50`).then((r) => setCustomers(r.items));

  useEffect(() => { load().catch(console.error); }, [search]);

  const resetForm = () => {
    setForm(emptyForm());
    setPhoneError(null);
    setSubmitError("");
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => { resetForm(); setShowForm(true); };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      phone: formatPhoneDisplay(customer.phone),
      email: customer.email || "",
      notes: customer.notes || "",
    });
    setPhoneError(null);
    setSubmitError("");
    setShowForm(true);
  };

  const getPhoneError = (phone: string) => {
    const formatError = validatePhone(phone, true);
    if (formatError) return formatError;
    return validatePhoneUnique(phone, customers, editingId);
  };

  const handlePhoneChange = (phone: string) => {
    const normalized = normalizePhone(phone);
    setForm((f) => ({ ...f, phone: normalized }));
    setPhoneError(getPhoneError(normalized));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const normalizedPhone = normalizePhone(form.phone);
    const phoneValidation = getPhoneError(normalizedPhone);
    setPhoneError(phoneValidation);
    if (phoneValidation || !form.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: normalizedPhone,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) await api.put(`/customers/${editingId}`, payload);
      else await api.post("/customers", payload);
      resetForm();
      load();
    } catch (err) {
      const message = getError(err, t("saveFailed"));
      if (isPhoneValidationMessage(message)) {
        setPhoneError(resolvePhoneApiError(message, tValidation));
        setSubmitError("");
      } else {
        setSubmitError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/customers/${deleteTarget.id}`);
      if (editingId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await load();
      toast("success", t("customerDeleted"));
    } catch (err) {
      toast("error", getError(err, tCommon("deleteFailed")));
    } finally {
      setDeleting(false);
    }
  };

  const isFormValid = form.name.trim().length > 0 && !getPhoneError(normalizePhone(form.phone));
  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t("addCustomer")}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">
                {editingId ? t("editCustomer") : t("addCustomer")}
              </h2>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("name")} *</label>
                <Input placeholder={t("namePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("phone")} *</label>
                <PhoneInput value={form.phone} onChange={handlePhoneChange} error={phoneError} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("email")}</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("notes")}</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              {submitError && <p className="col-span-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>}
              <div className="col-span-2 flex gap-2">
                <Button type="submit" disabled={!isFormValid || saving}>
                  {saving ? tCommon("saving") : editingId ? t("updateCustomer") : t("saveCustomer")}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="ps-9" placeholder={t("searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-start font-medium text-slate-600">{tCommon("name")}</th>
              <th className="px-4 py-3 text-start font-medium text-slate-600">{tCommon("phone")}</th>
              <th className="px-4 py-3 text-start font-medium text-slate-600">{t("visits")}</th>
              <th className="px-4 py-3 text-start font-medium text-slate-600">{t("totalSpent")}</th>
              <th className="px-4 py-3 text-start font-medium text-slate-600">{t("lastVisit")}</th>
              <th className="px-4 py-3 text-start font-medium text-slate-600">{tCommon("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono" dir="ltr">{c.phone || "—"}</td>
                <td className="px-4 py-3">{c.visitCount}</td>
                <td className="px-4 py-3">{formatCurrency(c.totalSpent)}</td>
                <td className="px-4 py-3 text-slate-500">{c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString(dateLocale) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 hover:text-violet-700 hover:bg-violet-50"
                      title={tCommon("edit")}
                      aria-label={tCommon("edit")}
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title={t("deleteCustomer")}
                        aria-label={t("deleteCustomer")}
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="text-center py-8 text-slate-400">{t("noCustomers")}</p>}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("deleteCustomerTitle")}
        message={t("deleteCustomerMessage", { name: deleteTarget?.name ?? "" })}
        confirmLabel={deleting ? tCommon("deleting") : tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
