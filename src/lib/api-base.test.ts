import { describe, expect, it } from "vitest";
import { resolveApiBase } from "./api-base";

describe("cPanel same-host API", () => {
  it("uses the current domain backendserver path even on a nested page", () => {
    const base = resolveApiBase("/backendserver/api/");
    expect(new URL(`${base}/member/wallet`, "https://client.example/member/transaction").href)
      .toBe("https://client.example/backendserver/api/member/wallet");
  });
  it("follows a different domain without rebuilding", () => {
    expect(new URL(`${resolveApiBase('/backendserver/api')}/admin/login`, "https://other.example/admin/login").href)
      .toBe("https://other.example/backendserver/api/admin/login");
  });
  it("uses the server.nexarofx.com development server by default", () => {
    expect(resolveApiBase(undefined)).toBe("https://server.nexarofx.com/lifeos/backendserver/api");
  });
  it("retains explicit API configuration outside cPanel", () => {
    expect(resolveApiBase("https://api.example/app/api/")).toBe("https://api.example/app/api");
  });
});