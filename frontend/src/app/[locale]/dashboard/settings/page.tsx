"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PasswordStrength, validatePassword } from "@/components/ui/password-strength";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("users");
  const tRoles = useTranslations("roles");
  const getError = useApiError();
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    const pwdError = validatePassword(newPassword, tUsers);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setMessage(t("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getError(err, t("changePasswordFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">{t("account")}</h2></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">{tCommon("name")}</span><span>{user?.fullName}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">{tCommon("email")}</span><span>{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">{tUsers("role")}</span><span>{user?.role ? tRoles(user.role as "Admin" | "Manager" | "Cashier") : ""}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">{t("business")}</span><span>{user?.tenantName}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">{t("changePassword")}</h2></CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("currentPassword")}</label>
              <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("newPassword")}</label>
              <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              <PasswordStrength password={newPassword} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("confirmPassword")}</label>
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {message && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{message}</p>}
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? tCommon("saving") : t("updatePassword")}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
