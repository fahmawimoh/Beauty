"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";
import type { Employee, Branch } from "@/types";

const roles = [
  { value: 1, key: "Admin" as const },
  { value: 2, key: "Manager" as const },
  { value: 3, key: "Cashier" as const },
];

export default function UsersPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const getError = useApiError();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "", role: 3, branchIds: [] as string[],
  });
  const [error, setError] = useState("");

  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    api.get<Employee[]>("/users").then(setUsers).catch(console.error);
    if (isAdmin) api.get<Branch[]>("/branches").then(setBranches).catch(() => {});
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/users", {
        ...form,
        branchIds: form.branchIds.length > 0 ? form.branchIds : user?.branches.map((b) => b.id) ?? [],
      });
      setShowForm(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", role: 3, branchIds: [] });
      api.get<Employee[]>("/users").then(setUsers);
    } catch (err) {
      setError(getError(err, t("createFailed")));
    }
  };

  if (user?.role === "Cashier") {
    return (
      <div className="text-center py-20">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">{t("accessRestricted")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("cashierOnly")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> {t("addUser")}</Button>
        )}
      </div>

      {showForm && isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <Input placeholder={`${tAuth("firstName")} *`} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input placeholder={`${tAuth("lastName")} *`} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input placeholder={`${tCommon("email")} *`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input placeholder={`${tAuth("password")} *`} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: Number(e.target.value) })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {tRoles(r.key)} — {t(`roleDescriptions.${r.key}`)}
                  </option>
                ))}
              </select>
              {branches.length > 0 && (
                <select multiple value={form.branchIds}
                  onChange={(e) => setForm({ ...form, branchIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              {error && <p className="col-span-2 text-sm text-red-500">{error}</p>}
              <div className="col-span-2 flex gap-2">
                <Button type="submit">{t("createUser")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">{tCommon("name")}</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">{tCommon("email")}</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">{t("role")}</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">{tCommon("status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.fullName}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === "Admin" ? "bg-violet-100 text-violet-700" :
                    u.role === "Manager" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>{tRoles(u.role as "Admin" | "Manager" | "Cashier")}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? tCommon("active") : tCommon("inactive")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
