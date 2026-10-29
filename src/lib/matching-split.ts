/** Matching paid per selected bill type, as returned by the PHP API (MatchingStats::split). */
export type MatchingTypeTotals = { paid: number; paid_events: number; flushed_events: number };
export type MatchingSplit = { BINARY: MatchingTypeTotals; ENROLLMENT: MatchingTypeTotals };
export const MATCHING_TYPE_LABELS: Record<keyof MatchingSplit, string> = {
  BINARY: "Binary Matching",
  ENROLLMENT: "Enrollment Matching",
};
export const MATCHING_TYPES = ["BINARY", "ENROLLMENT"] as const;
