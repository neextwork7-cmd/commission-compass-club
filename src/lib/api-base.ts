/** cPanel builds force a same-origin API; hosted previews keep their configured server. */
export function resolveApiBase(configured?: string): string {
  return (configured?.trim() || "https://server.nexarofx.com/lifeos/backendserver/api").replace(/\/+$/, "");
}

export const LIFEOS_API_BASE = resolveApiBase(import.meta.env["VITE_LIFEOS_API_URL"] as string | undefined);