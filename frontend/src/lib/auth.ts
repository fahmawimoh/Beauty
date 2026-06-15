import { useEffect, useState } from "react";
import { api } from "./api";
import { useAuthStore, usePosStore } from "./store";

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
    if (api.getToken()) {
      await api.post("/auth/logout");
    }
  } catch {
    // Always clear the local session even if the server call fails.
  }

  api.setToken(null);
  usePosStore.getState().clearCart();
  useAuthStore.persist.clearStorage();
  useAuthStore.setState({ user: null, isAuthenticated: false });
}
