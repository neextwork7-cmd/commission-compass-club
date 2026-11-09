// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { memberToken } from "./member-api";

describe("admin one-click member login", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it("uses the admin-opened member session only in its own tab", () => {
    localStorage.setItem("lifeos_member_token", "own-login");
    memberToken.startAdminSession("admin-opened");
    expect(memberToken.get()).toBe("admin-opened");
    expect(localStorage.getItem("lifeos_member_token")).toBe("own-login");
  });

  it("logging out of the admin-opened tab keeps the other sessions", () => {
    localStorage.setItem("lifeos_member_token", "own-login");
    localStorage.setItem("lifeos_admin_token", "admin");
    memberToken.startAdminSession("admin-opened");
    memberToken.clear();
    expect(memberToken.isAdminSession()).toBe(false);
    expect(localStorage.getItem("lifeos_member_token")).toBe("own-login");
    expect(localStorage.getItem("lifeos_admin_token")).toBe("admin");
  });
});
