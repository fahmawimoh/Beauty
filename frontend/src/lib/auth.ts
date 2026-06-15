import { useEffect, useState } from "react";
import { api } from "./api";
import {
  clearAllAuthStorage,
  isTokenExpired,
} from "./auth-storage";
import { useAuthStore, usePosStore } from "./store";

export {
  AUTH_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  buildLoginRedirectPath,
  clearAllAuthStorage,
  decodeJwtPayload,
  isPublicAuthRoute,
  isTokenExpired,
} from "./auth-storage";

let handlingSessionExpiration = false;

export function isAuthStateValid(): boolean {
  const token = api.getToken();
  const { isAuthenticated, user } = useAuthStore.getState();
  return Boolean(token && isAuthenticated && user && !isTokenExpired(token));
}

export function shouldTreatAsSessionExpired(): boolean {
  const token = api.getToken();
  const { isAuthenticated } = useAuthStore.getState();
  return Boolean((token && isTokenExpired(token)) || (isAuthenticated && !token));
}

export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(
    () => typeof window !== "undefined" && useAuthStore.persist.hasHydrated()
  );

  useEffect(() => {
    const markHydrated = () => setHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(markHydrated);
    markHydrated();
    return unsub;
  }, []);

  return hydrated;
}

export async function performLogout(): Promise<void> {
  try {
    if (api.getToken() && !isTokenExpired(api.getToken())) {
      await api.post("/auth/logout");
    }
  } catch {
    // Always clear the local session even if the server call fails.
  }

  api.setToken(null);
  usePosStore.getState().clearCart();
  useAuthStore.persist.clearStorage();
  useAuthStore.setState({ user: null, isAuthenticated: false, hasHydrated: true });
  clearAllAuthStorage();
}

export async function handleSessionExpiration(
  redirect?: (sessionExpired: boolean) => void
): Promise<void> {
  if (handlingSessionExpiration) return;

  handlingSessionExpiration = true;
  const sessionExpired = shouldTreatAsSessionExpired();

  try {
    await performLogout();
    redirect?.(sessionExpired);
  } finally {
    handlingSessionExpiration = false;
  }
}

export async function handleUnauthorizedResponse(
  redirect?: (sessionExpired: boolean) => void
): Promise<void> {
  if (handlingSessionExpiration) return;

  handlingSessionExpiration = true;
  try {
    await performLogout();
    redirect?.(true);
  } finally {
    handlingSessionExpiration = false;
  }
}
