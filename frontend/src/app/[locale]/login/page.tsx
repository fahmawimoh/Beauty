"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useAuthStore } from "@/lib/store";
import { useApiError } from "@/lib/errors";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const getError = useApiError();

  useEffect(() => {
    const redirectIfAuthenticated = () => {
      const { isAuthenticated, user } = useAuthStore.getState();
      const token = api.getToken();
      if (token && isAuthenticated) {
        router.replace(user?.role === "Cashier" ? "/pos" : "/dashboard");
      }
    };

    const unsub = useAuthStore.persist.onFinishHydration(redirectIfAuthenticated);
    if (useAuthStore.persist.hasHydrated()) redirectIfAuthenticated();
    return unsub;
  }, [router]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await login(email, password);
      router.push(session.role === "Cashier" ? "/pos" : "/dashboard");
    } catch (err) {
      setError(getError(err, t("loginFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-violet-900 to-purple-800 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">{tCommon("appName")}</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight">{t("heroTitle")}</h2>
          <p className="mt-4 text-indigo-200 text-lg">{t("heroSubtitle")}</p>
        </div>
        <p className="text-indigo-300 text-sm">{t("heroFooter")}</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <span className="text-xl font-bold">{tCommon("appName")}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("welcomeBack")}</h1>
          <p className="mt-1 text-slate-500">{t("signInSubtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("email")}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("password")}</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-violet-600 hover:text-violet-700">{t("createOne")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
