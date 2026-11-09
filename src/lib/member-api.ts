// Browser-only client for the standalone PHP member API.
import { LIFEOS_API_BASE as BASE } from "./api-base";
const KEY = "lifeos_member_token";
// Admin one-click logins live only in that tab, so several member tabs and the admin panel can stay open together.
const ADMIN_TAB_KEY = "lifeos_member_admin_session";

export const memberToken = {
  get: () => (typeof window === "undefined" ? null : window.sessionStorage.getItem(ADMIN_TAB_KEY) ?? window.localStorage.getItem(KEY)),
  set: (t: string) => { window.sessionStorage.removeItem(ADMIN_TAB_KEY); window.localStorage.setItem(KEY, t); },
  clear: () => {
    if (window.sessionStorage.getItem(ADMIN_TAB_KEY)) window.sessionStorage.removeItem(ADMIN_TAB_KEY);
    else window.localStorage.removeItem(KEY);
  },
  isAdminSession: () => typeof window !== "undefined" && !!window.sessionStorage.getItem(ADMIN_TAB_KEY),
  startAdminSession: (t: string) => window.sessionStorage.setItem(ADMIN_TAB_KEY, t),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Old demo sessions are no longer valid; the panel only shows the signed-in account. */
const LEGACY_DEMO_TOKEN = "demo";

export async function memberApi<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let token = memberToken.get();
  if (token === LEGACY_DEMO_TOKEN) { memberToken.clear(); token = null; }
  const res = await fetch(`${BASE}/member${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      // X-Auth-Token is a fallback for servers where Apache strips Authorization.
      ...(token ? { Authorization: `Bearer ${token}`, "X-Auth-Token": `Bearer ${token}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : null,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    if (res.status === 401) memberToken.clear();
    throw new ApiError(res.status, json?.error ?? json?.message ?? `Request failed (${res.status})`);
  }
  return (json && "data" in json ? json.data : json) as T;
}

export const bdt = (n: unknown) =>
  `${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT`;

export const LEDGER_LABELS: Record<string, string> = {
  CASHBACK: "Cashback Bonus (Service Only)",
  REFERRAL: "Direct Referral Bonus",
  MATCHING: "Matching Bonus",
  GENERATION: "Generation Bonus",
  RANK: "Rank Reward Bonus",
  ADJUSTMENT: "Adjustment",
};
