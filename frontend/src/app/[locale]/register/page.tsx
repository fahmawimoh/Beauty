"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";

const businessTypeKeys = ["1", "2", "3", "4", "99"] as const;

export default function RegisterPage() {
  const [form, setForm] = useState({
    businessName: "", businessType: 1, email: "", password: "",
    firstName: "", lastName: "", branchName: "Main Branch",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const getError = useApiError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(getError(err, t("registerFailed")));
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8 relative">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Sparkles className="h-6 w-6 text-violet-600" />
          <span className="text-xl font-bold">{tCommon("appName")}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
          <p className="mt-1 text-slate-500 text-sm">{t("registerSubtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("firstName")}</label>
                <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("lastName")}</label>
                <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("businessName")}</label>
              <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder={t("businessNamePlaceholder")} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("businessType")}</label>
              <select
                value={form.businessType}
                onChange={(e) => set("businessType", Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {businessTypeKeys.map((k) => (
                  <option key={k} value={k}>{t(`businessTypes.${k}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("email")}</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("password")}</label>
              <PasswordInput value={form.password} onChange={(e) => set("password", e.target.value)} minLength={6} required />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("creatingAccount") : t("createAccount")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-medium text-violet-600">{t("signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
