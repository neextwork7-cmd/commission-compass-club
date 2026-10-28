<?php
declare(strict_types=1);

namespace LifeOS\Engine;

use LifeOS\Config;
use LifeOS\DB;
use LifeOS\HttpError;

/** Minute recovery runner. Uses the existing engine, never invents new sale events. */
final class Settlement
{
    public static function run(bool $execute = false, int $batch = 100): array
    {
        if ($batch < 1 || $batch > 1000) throw new HttpError('Batch must be between 1 and 1000', 422);
        if ($execute && Config::get('commission_cron_enabled', false) !== true) {
            throw new HttpError('Commission cron execution requires approved server configuration', 403);
        }
        if ($execute && DB::val("SELECT v FROM lo_settings WHERE k='financial_release_approved'") !== '1') {
            throw new HttpError('Financial release has not been approved', 403);
        }
        $lock = 'lifeos:settlement:' . (string) DB::val('SELECT DATABASE()');
        if ((int) DB::val('SELECT GET_LOCK(?, 0)', [$lock]) !== 1) return ['status' => 'busy'];
        try {
            $ids = DB::all("SELECT id FROM lo_activations WHERE payment_status = 'SUCCESS' AND processed = 0 ORDER BY id LIMIT $batch");
            // Historical unfinished summaries catch up after downtime; current Dhaka day stays open.
            $dates = DB::all("SELECT DISTINCT DATE(e.created_at) AS day FROM lo_matching_events e
                LEFT JOIN lo_statements s ON s.user_id = e.beneficiary_id AND s.statement_date = DATE(e.created_at)
                WHERE e.created_at < CURRENT_DATE() AND s.statement_code IS NULL ORDER BY day LIMIT $batch");
            $result = ['status' => $execute ? 'executed' : 'dry-run', 'eligible_activations' => count($ids),
                'unfinished_days' => count($dates), 'processed' => 0, 'statements_closed' => 0, 'failed' => 0];
            if (!$execute) return $result;
            foreach ($ids as $row) {
                try {
                    Commission::processActivation((int) $row['id']);
                    $result['processed']++;
                } catch (\Throwable $error) {
                    // Never print user data, configuration, SQL, credentials or exception messages.
                    $result['failed']++;
                }
            }
            foreach ($dates as $row) {
                try { $result['statements_closed'] += Statements::close((string) $row['day']); }
                catch (\Throwable $error) { $result['failed']++; }
            }
            return $result;
        } finally {
            DB::val('SELECT RELEASE_LOCK(?)', [$lock]);
        }
    }
}