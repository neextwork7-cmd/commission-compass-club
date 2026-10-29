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

    public static function enabled(): bool { return Config::get('test_lab_enabled', false) === true; }

    private static function guard(): void
    {
        if (!self::enabled()) throw new HttpError('Test lab is disabled on this server', 403);
    }

    /**
     * Serialises every Test Lab action (reset, seed, day run, month step) so two admin tabs or a retried
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
            'matching_flushed' => (int) DB::val("SELECT COUNT(*) FROM lo_matching_events WHERE payout_status='FLUSHED'"),
            'job' => self::job(),
            'daily' => DB::all("SELECT DATE(created_at) AS day, COUNT(DISTINCT sale_id) AS sales,
                ROUND(SUM(CASE WHEN ledger_type='CASHBACK' THEN amount ELSE 0 END),2) AS cashback,
                ROUND(SUM(CASE WHEN ledger_type='REFERRAL' THEN amount ELSE 0 END),2) AS referral,
                ROUND(SUM(CASE WHEN ledger_type='GENERATION' THEN amount ELSE 0 END),2) AS generation,
                ROUND(SUM(CASE WHEN ledger_type='MATCHING' THEN amount ELSE 0 END),3) AS matching
                FROM lo_ledger WHERE status='PAID' GROUP BY DATE(created_at) ORDER BY day LIMIT 70"),
            'last_day' => json_decode((string) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_last'") ?: 'null'), true),
        ];
    }

    /** Deletes every account except ROOT and all commission/transaction history. */
    public static function reset(): array
    {
        self::guard();
        return self::exclusive(function () {
            $root = self::rootId();
            if ($root === null) throw new HttpError('ROOT account not found', 409);
            $removed = (int) DB::val('SELECT COUNT(*) FROM users WHERE id <> ?', [$root]);
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
            self::setClock(null);
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
            self::setClock((string) DB::val('SELECT CURRENT_DATE()'));
            self::createMembers(1, $count, $seed, false);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_days','0') ON DUPLICATE KEY UPDATE v='0'");
            return ['created' => $count, 'password' => 'test1234', 'usernames' => "test1 … test$count"];
        });
    }

    /**
     * Inserts paid-but-unsettled members test{$from}..test{$to} under existing accounts (no commission here).
     * Narrow mode (300 seed) favours recent sponsors for deep chains; wide mode mixes in random sponsors so
     * large month runs keep realistic team widths while still reaching 10+ generations.
     */
    private static function createMembers(int $from, int $to, int $seed, bool $wide): void
    {
        static $hash = null;
        $hash ??= password_hash('test1234', PASSWORD_DEFAULT);
        mt_srand($seed + $from);
        DB::tx(function () use ($from, $to, $hash, $wide) {
            $ids = array_map('intval', array_column(DB::all('SELECT id FROM users ORDER BY id'), 'id'));
            for ($i = $from; $i <= $to; $i++) {
                $n = count($ids);
                $recent = $wide ? mt_rand(0, 9) < 4 : mt_rand(0, 9) < 6;
                $sponsor = $recent ? $ids[max(0, $n - 1 - mt_rand(0, $wide ? 15 : 3))] : $ids[mt_rand(0, $n - 1)];
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
    }

    /** Current month-run job (members joining every simulated day, settled by the real cron each day). */
    public static function job(): ?array
    {
        $j = json_decode((string) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_job'") ?: 'null'), true);
        return is_array($j) ? $j : null;
    }

    private static function saveJob(?array $j): void
    {
        if ($j === null) DB::run("DELETE FROM lo_settings WHERE k='test_lab_job'");
        else DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_job',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode($j)]);
    }

    /** Reset + start in one locked action (GET_LOCK is re-entrant per connection). */
    public static function startFresh(int $members, int $days): array
    {
        self::guard();
        return self::exclusive(fn () => self::reset() + ['job' => self::startJob($members, $days)]);
    }

    /** Starts a fresh multi-day run: requires an empty lab (only ROOT). */
    public static function startJob(int $members, int $days, int $seed = 11): array
    {
        self::guard();
        return self::exclusive(function () use ($members, $days, $seed) {
            if ($members < 1 || $members > 20000) throw new HttpError('Members must be 1–20000', 422);
            if ($days < 1 || $days > 62) throw new HttpError('Days must be 1–62', 422);
            $root = self::rootId();
            if ($root === null) throw new HttpError('ROOT account not found', 409);
            if ((int) DB::val('SELECT COUNT(*) FROM users WHERE id <> ?', [$root]) > 0) throw new HttpError('Delete test accounts first (reset)', 409);
            $start = self::clock() ?? (string) DB::val('SELECT CURRENT_DATE()');
            self::setClock($start);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_days','0') ON DUPLICATE KEY UPDATE v='0'");
            $job = ['members' => $members, 'days' => $days, 'seed' => $seed, 'day' => 0, 'created' => 0, 'phase' => 'seed', 'start_date' => $start];
            self::saveJob($job);
            return $job;
        });
    }

    /**
     * Advances the month run for at most $budget seconds: create today's joiners, settle them with the
     * real cron, then move to the next day (midnight statement close). Safe to call repeatedly.
     */
    public static function step(float $budget = 25.0): array
    {
        self::guard();
        @set_time_limit(300);
        $t0 = microtime(true);
        $out = self::exclusive(fn () => self::stepLocked($t0, $budget), true);
        return $out ?? (self::job() ?? []) + ['busy' => true];
    }

    private static function stepLocked(float $t0, float $budget): array
    {
        $j = self::job();
        if ($j === null) throw new HttpError('No month run started', 409);
        // Trust the database, not a possibly stale job copy, for how many members already joined.
        $j['created'] = (int) DB::val("SELECT COUNT(*) FROM users WHERE life_id LIKE 'LT%'");
        while ($j['phase'] !== 'done' && microtime(true) - $t0 < $budget) {
            $day = (int) $j['day'];
            if ($j['phase'] === 'seed') {
                $target = (int) round($j['members'] * ($day + 1) / $j['days']);
                if ($j['created'] < $target) {
                    $to = min($target, $j['created'] + 100);
                    self::createMembers($j['created'] + 1, $to, (int) $j['seed'], true);
                    $j['created'] = $to;
                } else {
                    $j['phase'] = 'settle';
                }
            } else {
                $r = Settlement::run(true, 50, true);
                if (($r['status'] ?? '') === 'busy') break;
                $j['processed_today'] = ($j['processed_today'] ?? 0) + (int) ($r['processed'] ?? 0);
                $j['failed'] = ($j['failed'] ?? 0) + (int) ($r['failed'] ?? 0);
                if (($r['eligible_activations'] ?? 0) === 0 && ($r['unfinished_days'] ?? 0) === 0) {
                    $today = (string) DB::val('SELECT CURRENT_DATE()');
                    $next = (new \DateTimeImmutable($today))->modify('+1 day')->format('Y-m-d');
                    self::setClock($next);
                    $close = Settlement::run(true, 1000, true);
                    $j['failed'] += (int) ($close['failed'] ?? 0);
                    $rec = ['settled_date' => $today, 'next_date' => $next, 'processed' => (int) $j['processed_today'],
                        'statements_closed' => (int) ($close['statements_closed'] ?? 0), 'failed' => (int) ($close['failed'] ?? 0), 'members' => (int) $j['created']];
                    $j['processed_today'] = 0;
                    $j['day'] = $day + 1;
                    $j['phase'] = $j['day'] >= $j['days'] ? 'done' : 'seed';
                    DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_days',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [(string) $j['day']]);
                    DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_last',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode($rec)]);
                    DB::run("INSERT INTO lo_settings (k,v) VALUES ('cron_last_run',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode(['at' => date(DATE_ATOM), 'result' => ['status' => 'executed', 'test_lab' => true] + $rec])]);
                }
            }
            self::saveJob($j);
        }
        return $j;
    }

    /** Runs the real cron settlement for the simulated day, then moves the software to the next day. */
    public static function runDay(): array
    {
        self::guard();
        return self::exclusive(function () {
            $day = self::clock() ?? (string) DB::val('SELECT CURRENT_DATE()');
            self::setClock($day);
            $total = ['processed' => 0, 'statements_closed' => 0, 'failed' => 0];
            for ($i = 0; $i < 20; $i++) {
                $r = Settlement::run(true, 1000, true);
                foreach ($total as $k => $_) $total[$k] += (int) ($r[$k] ?? 0);
                if (($r['status'] ?? '') === 'busy') throw new HttpError('Settlement already running', 409);
                if (($r['eligible_activations'] ?? 0) === 0 && ($r['unfinished_days'] ?? 0) === 0) break;
                if (($r['processed'] ?? 0) === 0 && ($r['statements_closed'] ?? 0) === 0) break;
            }
            $next = (new \DateTimeImmutable($day))->modify('+1 day')->format('Y-m-d');
            self::setClock($next);
            // Midnight close of the finished day happens on the new date.
            $close = Settlement::run(true, 1000, true);
            $total['statements_closed'] += (int) ($close['statements_closed'] ?? 0);
            $total['failed'] += (int) ($close['failed'] ?? 0);
            $days = (int) (DB::val("SELECT v FROM lo_settings WHERE k='test_lab_days'") ?: 0) + 1;
            $record = ['settled_date' => $day, 'next_date' => $next] + $total;
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_days',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [(string) $days]);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('test_lab_last',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode($record)]);
            DB::run("INSERT INTO lo_settings (k,v) VALUES ('cron_last_run',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode(['at' => date(DATE_ATOM), 'result' => ['status' => 'executed', 'test_lab' => true] + $total])]);
            return $record;
        });
    }
}
