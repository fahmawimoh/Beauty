"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Users, Package, Scissors,
  Building2, BarChart3, UserCog, LogOut, Sparkles, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";

const allNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Manager"] },
  { href: "/pos", label: "POS", icon: ShoppingCart, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/customers", label: "Customers", icon: Users, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/services", label: "Services", icon: Scissors, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/products", label: "Products", icon: Package, roles: ["Admin", "Manager", "Cashier"] },
  { href: "/dashboard/users", label: "Users", icon: UserCog, roles: ["Admin", "Manager"] },
  { href: "/dashboard/branches", label: "Branches", icon: Building2, roles: ["Admin", "Manager"] },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["Admin", "Manager"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["Admin", "Manager", "Cashier"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex h-screen w-64 flex-col bg-indigo-950 text-indigo-100">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-indigo-900">
        <div className="rounded-lg bg-violet-500 p-1.5">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white text-sm leading-tight">{user?.tenantName || "BeautyOS"}</h1>
          <p className="text-xs text-indigo-300">{user?.branchName || "Management"}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {allNavItems.filter((item) => !user?.role || item.roles.includes(user.role)).map(({ href, label, icon: Icon }) => {
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
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-indigo-900 p-4">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
          <p className="text-xs text-indigo-300">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-900 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
