<?php
declare(strict_types=1);
namespace LifeOS;

use LifeOS\Engine\Placement;
use LifeOS\Engine\Settlement;

/**
 * Admin test lab: simulated business day, 300-member seed, one-day settlement and full reset.
 * Disabled unless runtime/config sets test_lab_enabled=true. Never use on a database with real money.
 */
final class TestLab
{
    public const TABLES = ['lo_volume_pairs', 'lo_volumes', 'lo_matching_decisions', 'lo_matching_events', 'lo_matching_bills',
        'lo_daily_caps', 'lo_statements', 'lo_ledger', 'lo_allocations', 'lo_pool_movements', 'lo_sales', 'lo_activations',
        'lo_enroll_legs', 'lo_user_ranks', 'lo_withdrawals', 'lo_transfers', 'lo_recharges'];

    /** Browser-generated id of the action being run, so the progress bar never shows another action's record. */
    public static string $runId = '';

    public static function enabled(): bool { return Config::get('test_lab_enabled', false) === true; }

    private static function guard(): void
    {
        if (!self::enabled()) throw new HttpError('Test lab is disabled on this server', 403);
    }

    /**
     * Serialises every Test Lab action (reset, seed, day run) so two admin tabs or a retried
     * request can never interleave member creation, settlement and deletion.
     */
    private static function exclusive(callable $fn, bool $quiet = false): mixed
    {
        $lock = 'lifeos:testlab:' . (string) DB::val('SELECT DATABASE()');
        if ((int) DB::val('SELECT GET_LOCK(?, 0)', [$lock]) !== 1) {
            if ($quiet) return null;
            throw new HttpError('Test Lab is busy with another action — wait and refresh', 409);
        }
        try { return $fn(); }
        finally { DB::val('SELECT RELEASE_LOCK(?)', [$lock]); }
    }

    /** Simulated Dhaka date or null when the real clock is used. */
    public static function clock(): ?string
    {
        if (!self::enabled()) return null;
        $d = DB::val("SELECT v FROM lo_settings WHERE k='test_clock_date'");
        return is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) ? $d : null;
    }

    /** Applies the simulated date to a MySQL session (NOW()/CURRENT_DATE follow it). */
    public static function applyClock(\PDO $pdo): void
    {
        if (!self::enabled()) return;
        try { $d = $pdo->query("SELECT v FROM lo_settings WHERE k='test_clock_date'")->fetchColumn(); }
        catch (\Throwable $e) { return; }
        if (is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
            $pdo->exec("SET timestamp = UNIX_TIMESTAMP('$d 12:00:00')");
        } else {
            $pdo->exec('SET timestamp = DEFAULT');
        }
    }

    private static function setClock(?string $date): void
    {
        if ($date === null) DB::run("DELETE FROM lo_settings WHERE k='test_clock_date'");
        else DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_clock_date',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [$date]);
        self::applyClock(DB::pdo());
    }

    public static function rootId(): ?int
    {
        $id = DB::val('SELECT user_id FROM lo_tree WHERE sponsor_id IS NULL AND placement_parent_id IS NULL ORDER BY user_id LIMIT 1');
        return $id === false || $id === null ? null : (int) $id;
    }

    public static function status(): array
    {
        $root = self::rootId();
        $sum = fn (string $t) => (float) DB::val("SELECT COALESCE(SUM(amount),0) FROM lo_ledger WHERE ledger_type=? AND status='PAID'", [$t]);
        return [
            'enabled' => self::enabled(),
            'simulated_date' => self::clock(),
            'today' => (string) DB::val('SELECT CURRENT_DATE()'),
            'days_run' => (int) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_days'") ?: 0),
            'root_life_id' => $root ? DB::val('SELECT life_id FROM users WHERE id=?', [$root]) : null,
            'members' => (int) DB::val('SELECT COUNT(*) FROM users') - ($root ? 1 : 0),
            'paid_activations' => (int) DB::val("SELECT COUNT(*) FROM lo_activations WHERE payment_status='SUCCESS'"),
            'waiting_settlement' => (int) DB::val("SELECT COUNT(*) FROM lo_activations WHERE payment_status='SUCCESS' AND processed=0"),
            'settled' => (int) DB::val("SELECT COUNT(*) FROM lo_activations WHERE processed=1"),
            'statements_closed' => (int) DB::val('SELECT COUNT(*) FROM lo_statements'),
            'totals' => ['CASHBACK' => $sum('CASHBACK'), 'REFERRAL' => $sum('REFERRAL'), 'GENERATION' => $sum('GENERATION'), 'MATCHING' => $sum('MATCHING')],
            'matching_split' => \LifeOS\Engine\MatchingStats::split(),
            'ranks' => DB::all('SELECT r.name, r.required_matchings, COUNT(ur.user_id) AS achieved FROM lo_ranks r LEFT JOIN lo_user_ranks ur ON ur.rank_id = r.id GROUP BY r.id, r.name, r.required_matchings ORDER BY r.id'),
            'top_matchings' => DB::all('SELECT u.username, u.life_id, t.lifetime_matchings FROM lo_tree t JOIN users u ON u.id = t.user_id ORDER BY t.lifetime_matchings DESC, u.id LIMIT 5'),
            'matching_flushed' => (int) DB::val("SELECT COUNT(*) FROM lo_matching_events WHERE payout_status='FLUSHED'"),
            'daily' => DB::all("SELECT DATE(created_at) AS day, COUNT(DISTINCT sale_id) AS sales,
                ROUND(SUM(CASE WHEN ledger_type='CASHBACK' THEN amount ELSE 0 END),2) AS cashback,
                ROUND(SUM(CASE WHEN ledger_type='REFERRAL' THEN amount ELSE 0 END),2) AS referral,
                ROUND(SUM(CASE WHEN ledger_type='GENERATION' THEN amount ELSE 0 END),2) AS generation,
                ROUND(SUM(CASE WHEN ledger_type='MATCHING' THEN amount ELSE 0 END),3) AS matching
                FROM lo_ledger WHERE status='PAID' GROUP BY DATE(created_at) ORDER BY day LIMIT 70"),
            'last_day' => json_decode((string) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_last'") ?: 'null'), true),
        ];
    }

    /** Login details of the Test Lab members (shared test password, never real accounts). */
    public static function logins(): array
    {
        return DB::all("SELECT u.username, u.life_id, p.name, s.life_id AS sponsor, t.placement_side AS side,
                COALESCE(a.processed, 0) AS settled
            FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id LEFT JOIN lo_tree t ON t.user_id = u.id
            LEFT JOIN users s ON s.id = t.sponsor_id
            LEFT JOIN lo_activations a ON a.user_id = u.id AND a.payment_status = 'SUCCESS'
            WHERE u.life_id LIKE 'LT%' ORDER BY u.id LIMIT 1000");
    }

    /** Deletes every account except ROOT and all commission/transaction history. */
    public static function reset(): array
    {
        self::guard();
        return self::exclusive(function () {
            $root = self::rootId();
            if ($root === null) throw new HttpError('ROOT account not found', 409);
            $removed = (int) DB::val('SELECT COUNT(*) FROM users WHERE id <> ?', [$root]);
            self::progress('reset', 0, 1);
            DB::tx(function () use ($root) {
                foreach (self::TABLES as $t) DB::run("DELETE FROM $t");
                DB::run('UPDATE lo_pools SET balance = 0');
                DB::run('DELETE FROM lo_tree WHERE user_id <> ?', [$root]);
                DB::run('UPDATE lo_tree SET left_child_id=NULL, right_child_id=NULL, left_carry=0, right_carry=0, left_consumed=0, right_consumed=0, lifetime_matchings=0, is_active=1 WHERE user_id=?', [$root]);
                DB::run('DELETE FROM user_profiles WHERE user_id <> ?', [$root]);
                DB::run('DELETE FROM user_wallets WHERE user_id <> ?', [$root]);
                DB::run('UPDATE user_wallets SET balance=0, frozen_balance=0, pending_balance=0, service_balance=0, cashback_balance=0 WHERE user_id=?', [$root]);
                DB::run('DELETE FROM users WHERE id <> ?', [$root]);
                DB::run("DELETE FROM lo_settings WHERE k IN ('test_lab_days','test_lab_last','cron_last_run','test_lab_job')");
            });
            // Back to the real Dhaka date; nothing is settled until Run 1 Day is pressed.
            self::setClock(null);
            self::setClock((string) DB::val('SELECT CURRENT_DATE()'));
            self::progress('reset', 1, 1);
            return ['removed_accounts' => $removed];
        });
    }

    /** Creates paid-but-unsettled members under ROOT. No commission is calculated here. */
    public static function seed(int $count = 300, int $seed = 11): array
    {
        self::guard();
        return self::exclusive(function () use ($count, $seed) {
            if ($count < 1 || $count > 1000) throw new HttpError('Count must be 1–1000', 422);
            $root = self::rootId();
            if ($root === null) throw new HttpError('ROOT account not found', 409);
            if ((int) DB::val('SELECT COUNT(*) FROM users WHERE id <> ?', [$root]) > 0) throw new HttpError('Delete test accounts first (reset)', 409);
            self::setClock(self::clock() ?? (string) DB::val('SELECT CURRENT_DATE()'));
            self::createMembers(1, $count, $seed);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_days','0') ON DUPLICATE KEY UPDATE v='0'");
            return ['created' => $count, 'password' => 'test1234', 'usernames' => "test1 … test$count", 'logins' => self::logins()];
        });
    }

    /**
     * Inserts paid-but-unsettled members test{$from}..test{$to} under existing accounts (no commission here).
     * 'deep' (first 300) mostly uses the newest sponsors so the tree reaches 10+ generations; 'spread' (later
     * daily sales) mixes recent and random sponsors so new sales reach both old and new teams.
     * Commits every 25 members so the admin progress bar can follow the work.
     */
    private static function createMembers(int $from, int $to, int $seed, string $mode = 'deep', string $action = 'create'): void
    {
        static $hash = null;
        $hash ??= password_hash('test1234', PASSWORD_DEFAULT);
        mt_srand($seed);
        $ids = array_map('intval', array_column(DB::all('SELECT id FROM users ORDER BY id'), 'id'));
        $total = $to - $from + 1;
        self::progress($action, 0, $total);
        for ($chunk = $from; $chunk <= $to; $chunk += 25) {
            $last = min($to, $chunk + 24);
            DB::tx(function () use ($chunk, $last, $hash, $mode, &$ids) {
                for ($i = $chunk; $i <= $last; $i++) {
                    $n = count($ids);
                    if ($mode === 'spread') $sponsor = mt_rand(0, 9) < 5 ? $ids[max(0, $n - 1 - mt_rand(0, 20))] : $ids[mt_rand(0, $n - 1)];
                    else $sponsor = mt_rand(0, 9) < 6 ? $ids[max(0, $n - 1 - mt_rand(0, 3))] : $ids[mt_rand(0, $n - 1)];
                    $team = mt_rand(0, 1) ? 'L' : 'R';
                    $life = sprintf('LT%06d', $i);
                    $id = DB::insert('INSERT INTO users (life_id, membership_no, referral_code, referred_by, phone, email, pin_hash, status, accepted_terms, username)
                        VALUES (?,?,?,?,?,?,?,"active",1,?)',
                        [$life, $life, sprintf('TEST%04d', $i), DB::val('SELECT referral_code FROM users WHERE id=?', [$sponsor]),
                         sprintf('0187%07d', $i), "test$i@example.test", $hash, "test$i"]);
                    DB::insert('INSERT INTO user_wallets (user_id) VALUES (?)', [$id]);
                    DB::insert('INSERT INTO user_profiles (user_id, name) VALUES (?, ?)', [$id, "Test Member $i"]);
                    Placement::ensureNode($id, $sponsor);
                    Placement::place($id, $sponsor, $team);
                    DB::insert("INSERT INTO lo_activations (activation_code, user_id, payment_ref, payment_status) VALUES (?,?,?,'SUCCESS')",
                        [sprintf('ACT-TEST%06d', $i), $id, sprintf('TEST-PAY-%06d', $i)]);
                    $ids[] = $id;
                }
            });
            self::progress($action, $last - $from + 1, $total);
        }
    }

    /**
     * Adds one day of new sales: $count new paid members (with their ৳1,000 activation transactions) on the
     * current software date, keeping all existing data. Nothing is settled until Run 1 Day.
     */
    public static function addSales(int $count = 300): array
    {
        self::guard();
        return self::exclusive(function () use ($count) {
            if ($count < 1 || $count > 1000) throw new HttpError('Count must be 1–1000', 422);
            if (self::rootId() === null) throw new HttpError('ROOT account not found', 409);
            $start = (int) DB::val("SELECT COALESCE(MAX(CAST(SUBSTRING(life_id,3) AS UNSIGNED)),0) FROM users WHERE life_id LIKE 'LT%'");
            if ($start === 0) throw new HttpError('Create the first 300 members first', 409);
            self::setClock(self::clock() ?? (string) DB::val('SELECT CURRENT_DATE()'));
            self::createMembers($start + 1, $start + $count, 1000 + $start, 'spread', 'sales');
            return ['added' => $count, 'from' => sprintf('test%d', $start + 1), 'to' => sprintf('test%d', $start + $count),
                'date' => (string) DB::val('SELECT CURRENT_DATE()'), 'password' => 'test1234',
                'waiting' => (int) DB::val("SELECT COUNT(*) FROM lo_activations WHERE payment_status='SUCCESS' AND processed=0")];
        });
    }

    /** Progress of the running Test Lab action, written outside transactions so other requests can read it. */
    private static function progress(string $action, int $done, int $total, array $extra = []): void
    {
        DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_progress',?) ON DUPLICATE KEY UPDATE v=VALUES(v)",
            [json_encode(['action' => $action, 'id' => substr(self::$runId, 0, 40), 'done' => $done, 'total' => max(1, $total)] + $extra)]);
    }

    public static function getProgress(): ?array
    {
        $p = json_decode((string) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_progress'") ?: 'null'), true);
        if (!is_array($p)) return null;
        $p['percent'] = (int) min(100, floor(100 * $p['done'] / max(1, $p['total'])));
        return $p;
    }

    /**
     * Runs the real cron settlement for the software date in slices of about $budget seconds (stays under the
     * host's 100-second proxy limit). While activations remain it returns partial=true without changing the date;
     * the call that finishes the day closes it at midnight and moves the whole software to the next day.
     */
    public static function runDay(float $budget = 40.0): array
    {
        self::guard();
        @set_time_limit(300);
        return self::exclusive(function () use ($budget) {
            $t0 = microtime(true);
            $day = self::clock() ?? (string) DB::val('SELECT CURRENT_DATE()');
            self::setClock($day);
            $waitingSql = "SELECT COUNT(*) FROM lo_activations WHERE payment_status='SUCCESS' AND processed=0";
            $prev = self::getProgress();
            $cont = self::$runId !== '' && $prev && $prev['action'] === 'run' && ($prev['id'] ?? '') === substr(self::$runId, 0, 40);
            $total = $cont ? (int) $prev['total'] : (int) DB::val($waitingSql) + 1;
            $acc = ['processed' => $cont ? (int) ($prev['p'] ?? 0) : 0, 'statements_closed' => $cont ? (int) ($prev['s'] ?? 0) : 0, 'failed' => $cont ? (int) ($prev['f'] ?? 0) : 0];
            $mark = fn () => self::progress('run', max(0, $total - 1 - (int) DB::val($waitingSql)), $total, ['p' => $acc['processed'], 's' => $acc['statements_closed'], 'f' => $acc['failed']]);
            $mark();
            $thisCall = 0;
            while (microtime(true) - $t0 < $budget) {
                // Small batches so the progress bar moves; the settlement engine and its lock are unchanged.
                $r = Settlement::run(true, 25, true);
                if (($r['status'] ?? '') === 'busy') throw new HttpError('Settlement already running', 409);
                foreach ($acc as $k => $_) $acc[$k] += (int) ($r[$k] ?? 0);
                $thisCall += (int) ($r['processed'] ?? 0);
                $mark();
                if (($r['eligible_activations'] ?? 0) === 0 && ($r['unfinished_days'] ?? 0) === 0) break;
                if (($r['processed'] ?? 0) === 0 && ($r['statements_closed'] ?? 0) === 0) break;
            }
            $left = (int) DB::val($waitingSql);
            // Keep going on the next call while work remains and this slice made progress.
            if ($left > 0 && $thisCall > 0) return ['partial' => true, 'settled_date' => $day, 'waiting' => $left] + $acc;
            $next = (new \DateTimeImmutable($day))->modify('+1 day')->format('Y-m-d');
            self::setClock($next);
            // Midnight close of the finished day happens on the new date.
            $close = Settlement::run(true, 1000, true);
            $acc['statements_closed'] += (int) ($close['statements_closed'] ?? 0);
            $acc['failed'] += (int) ($close['failed'] ?? 0);
            self::progress('run', $total, $total, ['p' => $acc['processed'], 's' => $acc['statements_closed'], 'f' => $acc['failed']]);
            $days = (int) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_days'") ?: 0) + 1;
            $record = ['settled_date' => $day, 'next_date' => $next] + $acc;
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_days',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [(string) $days]);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_last',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode($record)]);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('cron_last_run',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode(['at' => date(DATE_ATOM), 'result' => ['status' => 'executed', 'test_lab' => true] + $acc])]);
            return $record + ['partial' => false];
        });
    }
}
