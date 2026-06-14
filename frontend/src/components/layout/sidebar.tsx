"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Scissors,
  Building2, BarChart3, UserCog, Sparkles, Settings, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { LogoutButton } from "./logout-button";

const navKeys = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, roles: ["Admin", "Manager"] },
  { href: "/pos", key: "pos", icon: ShoppingCart, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/customers", key: "customers", icon: Users, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/services", key: "services", icon: Scissors, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/products", key: "products", icon: Package, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/users", key: "users", icon: UserCog, roles: ["Admin", "Manager"] },
  { href: "/dashboard/branches", key: "branches", icon: Building2, roles: ["Admin", "Manager"] },
  { href: "/dashboard/reports", key: "reports", icon: BarChart3, roles: ["Admin", "Manager"] },
  { href: "/dashboard/whatsapp", key: "whatsapp", icon: MessageCircle, roles: ["Admin", "Manager"] },
  { href: "/dashboard/settings", key: "settings", icon: Settings, roles: ["Admin", "Manager", "Cashier"] },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const locale = useLocale();

  return (
    <aside className="flex h-screen w-64 flex-col bg-indigo-950 text-indigo-100 shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-indigo-900">
        <div className="rounded-lg bg-violet-500 p-1.5">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm leading-tight">{user?.tenantName || tCommon("appName")}</h1>
          <p className="text-xs text-indigo-300">{user?.branchName || tCommon("management")}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navKeys.filter((item) => !user?.role || (item.roles as readonly string[]).includes(user.role)).map(({ href, key, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-violet-600 text-white" : "text-indigo-200 hover:bg-indigo-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-indigo-900 p-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
          <p className="text-xs text-indigo-300">{user?.role ? tRoles(user.role as "Admin") : ""}</p>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  );
}
