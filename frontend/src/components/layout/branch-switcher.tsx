"use client";

import { useAuthStore } from "@/lib/store";
import { Building2 } from "lucide-react";

export function BranchSwitcher() {
  const { user, switchBranch } = useAuthStore();

  if (!user || user.branches.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-slate-400" />
      <select
        value={user.branchId || ""}
        onChange={(e) => switchBranch(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500"
      >
        {user.branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}
