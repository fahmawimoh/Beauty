import { cn, formatCurrency } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  isCurrency?: boolean;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, isCurrency, className }: StatCardProps) {
  const displayValue =
    isCurrency && typeof value === "number" ? formatCurrency(value) : value;

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{displayValue}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-violet-50 p-2.5">
          <Icon className="h-5 w-5 text-violet-600" />
        </div>
      </div>
    </div>
  );
}
