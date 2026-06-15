"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import {
  buildLoginRedirectPath,
  handleSessionExpiration,
  handleUnauthorizedResponse,
  isAuthStateValid,
  isPublicAuthRoute,
  isTokenExpired,
} from "@/lib/auth";

const TOKEN_CHECK_INTERVAL_MS = 30_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const redirectToLogin = (sessionExpired: boolean) => {
      if (isPublicAuthRoute(pathname)) return;
      router.replace(buildLoginRedirectPath(sessionExpired));
    };

    api.setUnauthorizedHandler(async () => {
      await handleUnauthorizedResponse(redirectToLogin);
    });

    return () => api.setUnauthorizedHandler(null);
  }, [pathname, router]);

  useEffect(() => {
    if (isPublicAuthRoute(pathname)) return;

    const checkSession = () => {
      const token = api.getToken();
      if (token && isTokenExpired(token)) {
        void handleSessionExpiration((sessionExpired) => {
          if (!isPublicAuthRoute(pathname)) {
            router.replace(buildLoginRedirectPath(sessionExpired));
          }
        });
        return;
      }

      if (!isAuthStateValid()) {
        void handleSessionExpiration((sessionExpired) => {
          if (!isPublicAuthRoute(pathname)) {
            router.replace(buildLoginRedirectPath(sessionExpired));
          }
        });
      }
    };

    checkSession();
    const interval = window.setInterval(checkSession, TOKEN_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [pathname, router]);

  return <>{children}</>;
}
