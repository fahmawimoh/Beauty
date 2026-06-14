"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Shield, Pencil, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PasswordStrength, validatePassword } from "@/components/ui/password-strength";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";
import type { Employee, Branch } from "@/types";

const roles = [
  { value: 1, key: "Admin" as const },
  { value: 2, key: "Manager" as const },
  { value: 3, key: "Cashier" as const },
];

type RoleKey = (typeof roles)[number]["key"];

function normalizeRole(role: string | number): RoleKey {
  if (typeof role === "number") return roles.find((r) => r.value === role)?.key ?? "Cashier";
  return (roles.find((r) => r.key === role)?.key ?? "Cashier") as RoleKey;
}

function roleToNumber(role: string | number): number {
  if (typeof role === "number") return role;
  return roles.find((r) => r.key === role)?.value ?? 3;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export default function UsersPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const getError = useApiError();
  const { user } = useAuthStore();

  const [users, setUsers] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Employee | null>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    email: "", password: "", firstName: "", lastName: "", role: 3, branchIds: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    email: "", firstName: "", lastName: "", role: 3, isActive: true, branchIds: [] as string[],
  });
  const loadSeq = useRef(0);

  const isAdmin = user?.role === "Admin";

  const loadData = async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const data = await api.get<Employee[]>("/users");
      if (seq !== loadSeq.current) return;
      setUsers(data);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      toast("error", getError(err));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isAdmin) api.get<Branch[]>("/branches").then(setBranches).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!editingUser) return;
    setEditForm({
      email: editingUser.email,
      firstName: editingUser.firstName,
      lastName: editingUser.lastName,
      role: roleToNumber(editingUser.role),
      isActive: editingUser.isActive,
      branchIds: editingUser.branchIds ?? [],
    });
    setFormErrors({});
  }, [editingUser]);

  const validateUserForm = (data: { email: string; firstName: string; lastName: string; branchIds: string[] }) => {
    const errors: Record<string, string> = {};
    if (!data.firstName.trim() || !data.lastName.trim()) errors.name = t("nameRequired");
    if (!data.email.trim()) errors.email = t("emailRequired");
    else if (!data.email.includes("@")) errors.email = t("emailInvalid");
    if (data.branchIds.length === 0) errors.branches = t("branchRequired");
    return errors;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const branchIds = form.branchIds.length > 0 ? form.branchIds : user?.branches.map((b) => b.id) ?? [];
    const errors = validateUserForm({ ...form, branchIds });
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await api.post("/users", { ...form, branchIds });
      setShowForm(false);
      setForm({ email: "", password: "", firstName: "", lastName: "", role: 3, branchIds: [] });
      toast("success", t("userCreated"));
      await loadData();
    } catch (err) {
      const msg = getError(err, t("createFailed"));
      if (msg.toLowerCase().includes("email")) setFormErrors({ email: t("duplicateEmail") });
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const errors = validateUserForm(editForm);
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    try {
      await api.put(`/users/${editingUser.id}`, {
        email: editForm.email.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
        branchIds: editForm.branchIds,
        commissionRate: editingUser.commissionRate ?? null,
      });
      setEditingUser(null);
      toast("success", t("userUpdated"));
      await loadData();
    } catch (err) {
      const msg = getError(err, t("updateFailed"));
      if (msg.toLowerCase().includes("email")) setFormErrors({ email: t("duplicateEmail") });
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === user?.userId) {
      toast("warning", t("cannotDeleteSelf"));
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast("success", t("userDeleted"));
      await loadData();
    } catch (err) {
      toast("error", getError(err, tCommon("deleteFailed")));
    } finally {
      setDeleting(false);
    }
  };

  const openPasswordChange = (target: Employee) => {
    setPasswordTarget(target);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordErrors({});
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;

    const errors: Record<string, string> = {};
    const isSelf = passwordTarget.id === user?.userId;

    if (isSelf && !passwordForm.currentPassword.trim())
      errors.currentPassword = t("currentPassword") + " *";

    const pwdError = validatePassword(passwordForm.newPassword, t);
    if (pwdError) errors.newPassword = pwdError;

    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errors.confirmPassword = t("passwordMismatch");

    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);
    try {
      await api.post(`/users/${passwordTarget.id}/change-password`, {
        currentPassword: isSelf ? passwordForm.currentPassword : null,
        newPassword: passwordForm.newPassword,
      });
      setPasswordTarget(null);
      toast("success", t("passwordChanged"));
    } catch (err) {
      toast("error", getError(err, t("passwordChangeFailed")));
    } finally {
      setChangingPassword(false);
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

  const roleBadge = (role: string | number) => {
    const key = normalizeRole(role);
    const styles = {
      Admin: "bg-violet-100 text-violet-700",
      Manager: "bg-blue-100 text-blue-700",
      Cashier: "bg-slate-100 text-slate-600",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[key]}`}>
        {tRoles(key)}
      </span>
    );
  };

  const branchSelect = (
    value: string[],
    onChange: (ids: string[]) => void,
    error?: string
  ) => (
    <div>
      <FieldLabel>{t("branches")}</FieldLabel>
      <select
        multiple
        value={value}
        onChange={(e) => onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
        className="w-full min-h-[88px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      >
        {(branches.length > 0 ? branches : user?.branches.map((b) => ({ id: b.id, name: b.name })) ?? []).map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-400">{t("selectBranches")}</p>
      <FieldError message={error} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> {t("addUser")}
          </Button>
        )}
      </div>

      {showForm && isAdmin && (
        <Card className="border-violet-100 shadow-sm">
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>{tAuth("firstName")}</FieldLabel>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <FieldLabel>{tAuth("lastName")}</FieldLabel>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
              <div>
                <FieldLabel>{tCommon("email")}</FieldLabel>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <FieldError message={formErrors.email} />
              </div>
              <div>
                <FieldLabel>{tAuth("password")}</FieldLabel>
                <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
              </div>
              <div>
                <FieldLabel>{t("role")}</FieldLabel>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>{tRoles(r.key)} — {t(`roleDescriptions.${r.key}`)}</option>
                  ))}
                </select>
              </div>
              {isAdmin && branchSelect(form.branchIds, (ids) => setForm({ ...form, branchIds: ids }), formErrors.branches)}
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : t("createUser")}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{tCommon("cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={[
          { key: "name", header: tCommon("name"), sortable: true, sortValue: (r) => r.fullName, render: (r) => <span className="font-medium text-slate-900">{r.fullName}</span> },
          { key: "email", header: tCommon("email"), sortable: true, sortValue: (r) => r.email, render: (r) => <span className="text-slate-500">{r.email}</span> },
          { key: "role", header: t("role"), sortable: true, sortValue: (r) => normalizeRole(r.role), render: (r) => roleBadge(r.role) },
          { key: "status", header: tCommon("status"), sortable: true, sortValue: (r) => (r.isActive ? 1 : 0), render: (r) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {r.isActive ? tCommon("active") : tCommon("inactive")}
            </span>
          )},
        ]}
        data={users}
        keyExtractor={(r) => r.id}
        searchPlaceholder={t("searchUsers")}
        searchFilter={(r, q) => r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || normalizeRole(r.role).toLowerCase().includes(q)}
        emptyMessage={t("noUsers")}
        loading={loading}
        actionsHeader={tCommon("actions")}
        actions={(row) => isAdmin ? (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-violet-700 hover:bg-violet-50" title={t("changePassword")} onClick={() => openPasswordChange(row)}>
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-violet-700 hover:bg-violet-50" onClick={() => setEditingUser(row)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={row.id === user?.userId}
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      />

      <FormDialog
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={t("editUser")}
        subtitle={editingUser?.fullName}
        onSubmit={handleUpdate}
        submitLabel={saving ? tCommon("saving") : tCommon("save")}
        cancelLabel={tCommon("cancel")}
        loading={saving}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>{tAuth("firstName")}</FieldLabel>
            <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} autoFocus />
            <FieldError message={formErrors.name} />
          </div>
          <div>
            <FieldLabel>{tAuth("lastName")}</FieldLabel>
            <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>{tCommon("email")}</FieldLabel>
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <FieldError message={formErrors.email} />
          </div>
          <div>
            <FieldLabel>{t("role")}</FieldLabel>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{tRoles(r.key)} — {t(`roleDescriptions.${r.key}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>{tCommon("status")}</FieldLabel>
            <select
              value={editForm.isActive ? "active" : "inactive"}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
            >
              <option value="active">{tCommon("active")}</option>
              <option value="inactive">{tCommon("inactive")}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            {branchSelect(editForm.branchIds, (ids) => setEditForm({ ...editForm, branchIds: ids }), formErrors.branches)}
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={!!passwordTarget}
        onClose={() => setPasswordTarget(null)}
        title={t("changePassword")}
        subtitle={passwordTarget ? t("changePasswordFor", { name: passwordTarget.fullName }) : undefined}
        onSubmit={handleChangePassword}
        submitLabel={changingPassword ? tCommon("saving") : t("changePassword")}
        cancelLabel={tCommon("cancel")}
        loading={changingPassword}
      >
        {passwordTarget?.id === user?.userId && (
          <div>
            <FieldLabel>{t("currentPassword")}</FieldLabel>
            <PasswordInput value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} autoFocus />
            <FieldError message={passwordErrors.currentPassword} />
          </div>
        )}
        <div>
          <FieldLabel>{t("newPassword")}</FieldLabel>
          <PasswordInput
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            autoFocus={passwordTarget?.id !== user?.userId}
          />
          <PasswordStrength password={passwordForm.newPassword} />
          <FieldError message={passwordErrors.newPassword} />
        </div>
        <div>
          <FieldLabel>{t("confirmPassword")}</FieldLabel>
          <PasswordInput value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
          <FieldError message={passwordErrors.confirmPassword} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("deleteUserTitle")}
        message={t("deleteUserMessage", { name: deleteTarget?.fullName ?? "" })}
        confirmLabel={deleting ? tCommon("deleting") : tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}
