"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PasswordStrength, validatePassword } from "@/components/ui/password-strength";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";
import { normalizeDiscountType, type DiscountType } from "@/lib/discount";
import { cn } from "@/lib/utils";

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
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountMessage, setDiscountMessage] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    api.get<{ discountType: string }>("/settings")
      .then((s) => setDiscountType(normalizeDiscountType(s.discountType)))
      .catch(console.error);
  }, []);

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

  const handleDiscountTypeChange = async (nextType: DiscountType) => {
    if (!isAdmin || nextType === discountType) return;
    setDiscountMessage("");
    setDiscountError("");
    setDiscountLoading(true);
    try {
      const result = await api.put<{ discountType: string }>("/settings/discount-type", {
        discountType: nextType,
      });
      setDiscountType(normalizeDiscountType(result.discountType));
      setDiscountMessage(t("discountTypeUpdated"));
    } catch (err) {
      setDiscountError(getError(err, t("discountTypeUpdateFailed")));
    } finally {
      setDiscountLoading(false);
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
        <CardHeader><h2 className="font-semibold">{t("discountSettings")}</h2></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">{t("discountType")}</p>
          <div className="flex flex-wrap gap-2">
            {(["PERCENTAGE", "FIXED"] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={!isAdmin || discountLoading}
                onClick={() => handleDiscountTypeChange(type)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  discountType === type
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-slate-200 text-slate-600 hover:border-violet-300",
                  !isAdmin && "cursor-default opacity-80"
                )}
              >
                {type === "PERCENTAGE" ? t("discountTypePercentage") : t("discountTypeFixed")}
              </button>
            ))}
          </div>
          {!isAdmin && (
            <p className="text-xs text-slate-400">{t("discountTypeAdminOnly")}</p>
          )}
          {discountMessage && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{discountMessage}</p>}
          {discountError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{discountError}</p>}
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
