import { api } from "./api";
import { useAuthStore, usePosStore } from "./store";

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
