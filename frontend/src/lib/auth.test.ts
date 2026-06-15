import { describe, expect, it } from "vitest";
import {
  buildLoginRedirectPath,
  decodeJwtPayload,
  isPublicAuthRoute,
  isTokenExpired,
} from "./auth-storage";

function createToken(expiresAtSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ exp: expiresAtSeconds }));
  return `${header}.${payload}.signature`;
}

describe("decodeJwtPayload", () => {
  it("reads exp from a JWT payload", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = decodeJwtPayload(createToken(exp));
    expect(payload?.exp).toBe(exp);
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("returns false for a valid token", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    expect(isTokenExpired(createToken(exp))).toBe(false);
  });

  it("returns true for an expired token", () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(isTokenExpired(createToken(exp))).toBe(true);
  });

  it("returns true when token is missing", () => {
    expect(isTokenExpired(null)).toBe(true);
  });
});

describe("isPublicAuthRoute", () => {
  it("detects localized public routes", () => {
    expect(isPublicAuthRoute("/en/login")).toBe(true);
    expect(isPublicAuthRoute("/ar/register")).toBe(true);
    expect(isPublicAuthRoute("/en/dashboard")).toBe(false);
  });
});

describe("buildLoginRedirectPath", () => {
  it("adds sessionExpired query when needed", () => {
    expect(buildLoginRedirectPath(true)).toBe("/login?sessionExpired=1");
    expect(buildLoginRedirectPath(false)).toBe("/login");
  });
});
