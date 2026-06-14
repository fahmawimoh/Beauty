"use client";

import { type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  loading?: boolean;
  variant?: "danger" | "warning";
  warning?: string;
  confirmDisabled?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
  variant = "danger",
  warning,
  confirmDisabled = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      {warning && (
        <div className={cn(
          "mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
          variant === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800"
        )}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}
      {children}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={loading || confirmDisabled}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
