<?php
declare(strict_types=1);

namespace LifeOS\Engine;

use LifeOS\DB;
use LifeOS\HttpError;

/** Immutable daily summaries; closing never creates commission payments. */
final class Statements
{
    public static function isFinishedDate(string $date, ?\DateTimeImmutable $now = null): bool
    {
        $zone = new \DateTimeZone('Asia/Dhaka');
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date, $zone);
        $today = ($now ?? new \DateTimeImmutable('now', $zone))->setTimezone($zone)->format('Y-m-d');
        return $parsed !== false && $parsed->format('Y-m-d') === $date && $date < $today;
    }

    public static function close(string $date): int
    {
        if (!self::isFinishedDate($date)) throw new HttpError('Only a finished past day can be closed', 422);
        return DB::tx(function () use ($date) {
            $rows = DB::all("SELECT beneficiary_id AS uid, COALESCE(SUM(CASE WHEN payout_status = 'PAID' THEN actual_payout ELSE 0 END),0) AS paid, COUNT(*) AS n
                FROM lo_matching_events WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY beneficiary_id", [$date, $date]);
            $closed = 0;
            foreach ($rows as $row) {
                $closed += DB::run('INSERT IGNORE INTO lo_statements (statement_code, user_id, statement_date, matching_paid, event_count) VALUES (?,?,?,?,?)',
                    ['ST-' . str_replace('-', '', $date) . '-' . $row['uid'], (int) $row['uid'], $date, $row['paid'], (int) $row['n']]);
            }
            return $closed;
        });
    }
}