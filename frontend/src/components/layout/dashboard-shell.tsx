"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Sidebar } from "./sidebar";
import { BranchSwitcher } from "./branch-switcher";
import { LanguageSwitcher } from "./language-switcher";
import { LogoutButton } from "./logout-button";
import { ToastContainer } from "@/components/ui/toast-container";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { performLogout } from "@/lib/auth";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedLocale = localStorage.getItem("BEAUTY_LOCALE");
    if (savedLocale && savedLocale !== locale) {
      document.cookie = `BEAUTY_LOCALE=${savedLocale};path=/;max-age=31536000`;
    }

    api.setUnauthorizedHandler(async () => {
      await performLogout();
      router.replace("/login");
    });

    if (token) {
      api.setToken(token);
    } else if (isAuthenticated) {
      void performLogout();
      router.replace("/login");
      return;
    }

    if (!token && !isAuthenticated) {
      router.replace("/login");
    }

    return () => api.setUnauthorizedHandler(null);
  }, [isAuthenticated, router, locale]);

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  const dateLocale = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="flex h-screen overflow-hidden">
      <ToastContainer />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
          <BranchSwitcher />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="text-sm text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
            <LogoutButton variant="header" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
