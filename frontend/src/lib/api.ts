import type { ApiResponse } from "@/types";
import { isTokenExpired } from "./auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/logout"] as const;

type UnauthorizedHandler = (sessionExpired: boolean) => void | Promise<void>;

class ApiClient {
  private token: string | null = null;
  private unauthorizedHandler: UnauthorizedHandler | null = null;
  private handlingUnauthorized = false;

  setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    this.unauthorizedHandler = handler;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  hasToken(): boolean {
    return Boolean(this.getToken());
  }

  private isAuthEndpoint(endpoint: string): boolean {
    return AUTH_ENDPOINTS.some((path) => endpoint.includes(path));
  }

  private async handleUnauthorized() {
    if (this.handlingUnauthorized || !this.unauthorizedHandler) return;
    this.handlingUnauthorized = true;
    try {
      await this.unauthorizedHandler(true);
    } finally {
      this.handlingUnauthorized = false;
    }
  }

  private async parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
    try {
      return (await res.json()) as ApiResponse<T>;
    } catch {
      return {
        success: false,
        data: null,
        message: res.statusText || "Request failed",
      };
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();

    if (token && isTokenExpired(token) && !this.isAuthEndpoint(endpoint)) {
      await this.handleUnauthorized();
      throw new Error("Your session has expired. Please log in again.");
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const json = await this.parseResponse<T>(res);

    if (res.status === 401 && !this.isAuthEndpoint(endpoint)) {
      await this.handleUnauthorized();
      throw new Error(json.message || "Your session has expired. Please log in again.");
    }

    if (res.status === 403) {
      throw new Error(json.message || "You do not have permission to access this resource.");
    }

    if (!res.ok) {
      throw new Error(json.message || `Request failed: ${res.status}`);
    }
    if (!json.success) {
      throw new Error(json.message || "Request failed");
    }
    return json.data as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient();
