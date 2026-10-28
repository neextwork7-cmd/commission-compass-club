import { createFileRoute } from "@tanstack/react-router";
import { MatchingReport } from "@/components/matching-report";

export const Route = createFileRoute("/member/matching-placement")({
  head: () => ({ meta: [{ title: "Enrollment Matching — Life OS Member" }, { name: "description", content: "Your Enrollment matching income events by plan rules." }, { property: "og:title", content: "Enrollment Matching — Life OS Member" }, { property: "og:description", content: "Your Enrollment matching income events by plan rules." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <MatchingReport type="ENROLLMENT" title="Enrollment Matching" />,
});
