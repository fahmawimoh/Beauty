"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const PASSWORD_MIN_LENGTH = 8;

export function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export function validatePassword(password: string, t: (key: string) => string): string | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) return t("passwordMinLength");
  if (!/[A-Z]/.test(password)) return t("passwordUppercase");
  if (!/[a-z]/.test(password)) return t("passwordLowercase");
  if (!/\d/.test(password)) return t("passwordDigit");
  return null;
}

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations("users");
  const score = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  const levels = [
    { label: t("strengthWeak"), color: "bg-red-400" },
    { label: t("strengthFair"), color: "bg-amber-400" },
    { label: t("strengthGood"), color: "bg-yellow-400" },
    { label: t("strengthStrong"), color: "bg-emerald-400" },
    { label: t("strengthVeryStrong"), color: "bg-emerald-600" },
  ];

  const level = levels[Math.min(score, levels.length) - 1] ?? levels[0];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {levels.map((_, i) => (
          <div
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i < score ? level.color : "bg-slate-200")}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">{score > 0 ? level.label : t("strengthWeak")}</p>
    </div>
  );
}
