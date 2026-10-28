import { createFileRoute } from "@tanstack/react-router";
import { Msg, Page, useMember, fmtDate } from "@/components/member-kit";

export const Route = createFileRoute("/member/notice")({
  head: () => ({ meta: [{ title: "Account Notice — Life OS Member" }, { name: "description", content: "Life OS member notices." }, { property: "og:title", content: "Account Notice — Life OS Member" }, { property: "og:description", content: "Life OS member notices." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AccountNotice,
});

function AccountNotice() {
  const q = useMember<{ id: number; kind: string; title: string | null; content: string; updated_at: string }[]>("notices", "/notices");
  return <Page title="Notice Board Files">
    <Msg text={q.error ? (q.error as Error).message : null} />
    {q.isPending ? <center>Loading…</center> : !q.error && !q.data?.length ? <center>No Notice Found</center> : null}
    {!!q.data?.length && <div className="noticed">
      {q.data.map((n) => <div key={n.id} className="noticed_div">
        <span>{fmtDate(n.updated_at)}</span>
        <b>{n.title || (n.kind === "SCROLL" ? "Latest News" : "Notice")}</b>
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "5px 0 0" }}>{n.content}</p>
      </div>)}
    </div>}
  </Page>;
}
