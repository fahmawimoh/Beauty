export const AUTH_STORAGE_KEY = "auth-storage";
export const TOKEN_STORAGE_KEY = "token";
const PRESERVED_COOKIES = new Set(["BEAUTY_LOCALE"]);

export function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, skewSeconds = 0): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= (payload.exp - skewSeconds) * 1000;
}

export function isPublicAuthRoute(pathname: string): boolean {
  const normalized = pathname.replace(/^\/(en|ar)/, "") || "/";
  return normalized === "/login" || normalized === "/register";
}

export function clearAuthCookies(): void {
  if (typeof document === "undefined") return;

  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name || PRESERVED_COOKIES.has(name)) continue;
    document.cookie = `${name}=;path=/;max-age=0`;
  }
}

export function clearAllAuthStorage(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.clear();
  clearAuthCookies();
}

export function buildLoginRedirectPath(sessionExpired: boolean): string {
  return sessionExpired ? "/login?sessionExpired=1" : "/login";
}
