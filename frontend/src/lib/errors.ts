"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
const errorMap: Record<number, string> = {
  401: "unauthorized",
  403: "forbidden",
  404: "notFound",
  500: "serverError",
};

export function useApiError() {
  const t = useTranslations("errors");

  return useCallback((err: unknown, fallback?: string): string => {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      if (msg.includes("fetch") || msg.includes("network")) return t("networkError");
      if (msg.includes("401") || msg.includes("unauthorized")) return t("unauthorized");
      if (msg.includes("403") || msg.includes("forbidden")) return t("forbidden");
      return err.message || fallback || t("requestFailed");
    }
    return fallback || t("requestFailed");
  }, [t]);
}

export function translateApiStatus(status: number): string {
  const key = errorMap[status];
  return key ?? "requestFailed";
}
