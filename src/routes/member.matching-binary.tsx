import { createFileRoute } from "@tanstack/react-router";
import { MatchingReport } from "@/components/matching-report";

export const Route = createFileRoute("/member/matching-binary")({
  head: () => ({ meta: [{ title: "Binary Matching — Life OS Member" }, { name: "description", content: "Your Binary matching income events by plan rules." }, { property: "og:title", content: "Binary Matching — Life OS Member" }, { property: "og:description", content: "Your Binary matching income events by plan rules." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <MatchingReport type="BINARY" title="Binary Matching" />,
});
