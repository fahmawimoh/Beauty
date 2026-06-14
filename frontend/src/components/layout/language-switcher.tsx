"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const labels: Record<Locale, string> = { en: "EN", ar: "عربي" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("BEAUTY_LOCALE", next);
    }
    router.replace(pathname, { locale: next });
  };

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1", className)}>
      <Globe className="h-4 w-4 text-slate-400 ms-1" />
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            locale === loc ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  );
}
