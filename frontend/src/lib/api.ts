import type { ApiResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type UnauthorizedHandler = () => void | Promise<void>;

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

  private async handleUnauthorized() {
    if (this.handlingUnauthorized || !this.unauthorizedHandler) return;
    this.handlingUnauthorized = true;
    try {
      await this.unauthorizedHandler();
    } finally {
      this.handlingUnauthorized = false;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch {
      throw new Error("Unable to connect to the server.");
    }

    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      throw new Error(res.ok ? "Invalid server response." : `Request failed: ${res.status}`);
    }

    if (
      res.status === 401 &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("/auth/register") &&
      !endpoint.includes("/auth/logout")
    ) {
      await this.handleUnauthorized();
      throw new Error(json.message || "Unauthorized");
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
