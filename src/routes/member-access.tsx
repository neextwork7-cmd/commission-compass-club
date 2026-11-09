import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { memberToken } from "@/lib/member-api";

export const Route = createFileRoute("/member-access")({
  head: () => ({
    meta: [
      { title: "Opening Member Account — Life OS" },
      { name: "description", content: "Opens a member account from the Life OS admin panel." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Opening Member Account — Life OS" },
      { property: "og:description", content: "Opens a member account from the Life OS admin panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: MemberAccess,
});

/** Receives an admin one-click login (token in the URL hash, never sent to a server) and opens the member panel in this tab only. */
function MemberAccess() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("t");
    if (token) {
      memberToken.startAdminSession(token);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Safe to run twice: the session stays in this tab once the link was read.
    if (!memberToken.isAdminSession()) { setFailed(true); return; }
    navigate({ to: "/member", replace: true });
  }, [navigate]);

  return (
    <p style={{ padding: 40, textAlign: "center", fontFamily: "Tahoma, sans-serif" }}>
      {failed ? "This login link is empty or expired. Use the Login button in the admin Member List again." : "Opening member account…"}
    </p>
  );
}
