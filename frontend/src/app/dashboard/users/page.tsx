"use client";

import { useEffect, useState } from "react";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { Employee, Branch } from "@/types";

const roles = [
  { value: 1, label: "Admin", description: "Full system access" },
  { value: 2, label: "Manager", description: "Reports and management" },
  { value: 3, label: "Cashier", description: "POS access only" },
];

export default function UsersPage() {
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
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  if (user?.role === "Cashier") {
    return (
      <div className="text-center py-20">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-700">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">Cashier accounts have POS access only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-slate-500">Manage admin, manager, and cashier accounts</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Add User</Button>
        )}
      </div>

      {showForm && isAdmin && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <Input placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              <Input placeholder="Last name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              <Input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input placeholder="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: Number(e.target.value) })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {roles.map((r) => <option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}
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
                <Button type="submit">Create User</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
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
                  }`}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? "Active" : "Inactive"}
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
