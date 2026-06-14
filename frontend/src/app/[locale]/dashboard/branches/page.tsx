"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Branch } from "@/types";

export default function BranchesPage() {
  const t = useTranslations("branches");
  const tCommon = useTranslations("common");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });

  const load = () => api.get<Branch[]>("/branches").then(setBranches);
  useEffect(() => { load().catch(console.error); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/branches", form);
    setForm({ name: "", address: "", phone: "", email: "" });
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> {t("addBranch")}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <Input placeholder={`${t("branchName")} *`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder={tCommon("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder={tCommon("address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="col-span-2" />
              <Input placeholder={tCommon("email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div className="flex gap-2">
                <Button type="submit">{t("createBranch")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => (
          <Card key={b.id}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-50 p-2"><Building2 className="h-5 w-5 text-indigo-600" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{b.name}</h3>
                  {b.address && <p className="text-sm text-slate-500 mt-0.5">{b.address}</p>}
                  {b.phone && <p className="text-sm text-slate-400">{b.phone}</p>}
                  <div className="mt-2 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${b.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {b.isActive ? tCommon("active") : tCommon("inactive")}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{b.inventoryMode}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
