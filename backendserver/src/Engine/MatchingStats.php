<?php
declare(strict_types=1);

namespace LifeOS\Engine;

use LifeOS\DB;

/**
 * Matching totals split by the selected bill type (BINARY vs ENROLLMENT), read from lo_matching_events.
 * Every event has exactly one selected type, so BINARY + ENROLLMENT always equals the matching ledger.
 */
final class MatchingStats
{
    /** @return array{BINARY: array, ENROLLMENT: array} paid amount, paid events, flushed events per type. */
    public static function split(?int $userId = null, ?string $day = null): array
    {
        $where = ['selected_type IS NOT NULL'];
        $p = [];
        if ($userId !== null) { $where[] = 'beneficiary_id = ?'; $p[] = $userId; }
        if ($day !== null) { $where[] = 'created_at >= ? AND created_at < ? + INTERVAL 1 DAY'; $p[] = $day; $p[] = $day; }
        $rows = DB::all('SELECT selected_type AS t,
                COALESCE(SUM(CASE WHEN payout_status = \'PAID\' THEN actual_payout ELSE 0 END), 0) AS paid,
                SUM(payout_status = \'PAID\') AS paid_events, SUM(payout_status = \'FLUSHED\') AS flushed_events
            FROM lo_matching_events WHERE ' . implode(' AND ', $where) . ' GROUP BY selected_type', $p);
        $out = [];
        foreach (['BINARY', 'ENROLLMENT'] as $t) $out[$t] = ['paid' => 0.0, 'paid_events' => 0, 'flushed_events' => 0];
        foreach ($rows as $r) {
            $out[$r['t']] = ['paid' => round((float) $r['paid'], 6), 'paid_events' => (int) $r['paid_events'], 'flushed_events' => (int) $r['flushed_events']];
        }
        return $out;
    }
}
