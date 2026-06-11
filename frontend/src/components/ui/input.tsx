import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors",
        "placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
