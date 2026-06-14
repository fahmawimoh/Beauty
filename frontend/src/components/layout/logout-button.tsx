"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  variant?: "header" | "sidebar";
  className?: string;
}

export function LogoutButton({ variant = "header", className }: LogoutButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");

  if (!isAuthenticated) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-900 hover:text-white transition-colors",
            className
          )}
        >
          <LogOut className="h-4 w-4 rtl-flip" />
          {t("signOut")}
        </button>
        <LogoutDialog
          open={open}
          loading={loading}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
          title={tAuth("logoutConfirmTitle")}
          message={tAuth("logoutConfirmMessage")}
          cancelLabel={tAuth("logoutCancel")}
          confirmLabel={loading ? tAuth("loggingOut") : tAuth("logoutConfirm")}
        />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("gap-2", className)}
      >
        <LogOut className="h-4 w-4 rtl-flip" />
        <span className="hidden sm:inline">{t("signOut")}</span>
      </Button>
      <LogoutDialog
        open={open}
        loading={loading}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title={tAuth("logoutConfirmTitle")}
        message={tAuth("logoutConfirmMessage")}
        cancelLabel={tAuth("logoutCancel")}
        confirmLabel={loading ? tAuth("loggingOut") : tAuth("logoutConfirm")}
      />
    </>
  );
}

function LogoutDialog({
  open,
  loading,
  onClose,
  onConfirm,
  title,
  message,
  cancelLabel,
  confirmLabel,
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
