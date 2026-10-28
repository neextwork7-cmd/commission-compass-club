import { createFileRoute } from "@tanstack/react-router";
import { TransferReport } from "./member.transaction-report";

export const Route = createFileRoute("/member/receive-report")({
  head: () => ({ meta: [{ title: "Receive Reports — Life OS Member" }, { name: "description", content: "Your incoming Life OS balance transfers." }, { property: "og:title", content: "Receive Reports — Life OS Member" }, { property: "og:description", content: "Your incoming Life OS balance transfers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <TransferReport title="Balance - Receive Report" path="/transfers/in" keyName="transfers-in" sent={false} />,
});
