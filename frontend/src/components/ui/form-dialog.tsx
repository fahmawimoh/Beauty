"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  submitLabel: string;
  cancelLabel: string;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}

export function FormDialog({
  open,
  onClose,
  title,
  subtitle,
  onSubmit,
  children,
  submitLabel,
  cancelLabel,
  loading = false,
  size = "md",
}: FormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size={size}>
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {children}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={loading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
