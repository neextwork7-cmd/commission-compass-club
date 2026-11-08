import { createFileRoute, redirect } from "@tanstack/react-router";

// Balance transfer was replaced by Active New ID; old links land on its history.
export const Route = createFileRoute("/member/receive-report")({
  beforeLoad: () => { throw redirect({ to: "/member/transaction-report" }); },
});
