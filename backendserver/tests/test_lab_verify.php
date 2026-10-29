<?php
declare(strict_types=1);

/**
 * Verifies the current Test Lab ledger against an independent plan model (run after Test Lab day runs).
 * Builds ROOT + many members through the real API, settles activations through the
 * real cron runner (bin/settle.php --execute) and admin confirmation, then
 * recomputes every commission independently from the plan and compares with the ledger.
 * Usage (API on 127.0.0.1:8090, fresh DB): php backendserver/tests/plan_simulation.php [members=60] [seed=7]
 */

require dirname(__DIR__) . '/src/bootstrap.php';
use LifeOS\DB;

$cfg = \LifeOS\Config::get('db');
if (!in_array($cfg['host'], ['127.0.0.1', 'localhost'], true)) { fwrite(STDERR, "Refusing: not a local database\n"); exit(2); }

$fail = 0; $pass = 0;
function check(string $name, bool $ok, string $detail = ''): void {
    global $fail, $pass; $ok ? $pass++ : $fail++;
    echo ($ok ? 'ok    ' : 'FAIL  ') . $name . ($ok || $detail === '' ? '' : "  [$detail]") . "\n";
}
$accounts=DB::all("SELECT id FROM users");
// ---------- 2. Independent plan model ----------
$tree = []; foreach (DB::all('SELECT user_id, sponsor_id, placement_parent_id, placement_side FROM lo_tree') as $t) $tree[(int) $t['user_id']] = $t;
$sales = DB::all("SELECT s.id, s.user_id, s.activation_id, DATE(s.created_at) AS day FROM lo_sales s JOIN lo_activations a ON a.id=s.activation_id WHERE a.payment_status='SUCCESS' ORDER BY s.id");
$GEN = [1 => 50, 2 => 30, 3 => 25, 4 => 20, 5 => 18, 6 => 15, 7 => 12, 8 => 10, 9 => 10, 10 => 10];
$exp = []; $add = function (int $u, string $t, float $a) use (&$exp) { $exp[$u][$t] = ($exp[$u][$t] ?? 0) + $a; };
$daily = []; $isActive = [(int) DB::val("SELECT user_id FROM lo_tree WHERE sponsor_id IS NULL AND is_active=1 ORDER BY user_id LIMIT 1") => true]; $carry = []; $legs = []; $saleMatch = [];
foreach ($sales as $s) {
    $u = (int) $s['user_id']; $sid = (int) $s['id']; $isActive[$u] = true;
    $add($u, 'CASHBACK', 100);
    $sp = $tree[$u]['sponsor_id'] !== null ? (int) $tree[$u]['sponsor_id'] : null;
    if ($sp !== null && !empty($isActive[$sp])) $add($sp, 'REFERRAL', 200);
    $cur = $sp; $blocked = false;
    for ($g = 1; $g <= 10 && $cur !== null; $g++) {
        if (empty($isActive[$cur])) $blocked = true;
        if (!$blocked) $add($cur, 'GENERATION', $GEN[$g]);
        $cur = $tree[$cur]['sponsor_id'] !== null ? (int) $tree[$cur]['sponsor_id'] : null;
    }
    $cand = [];
    $node = $u; // binary
    while ($tree[$node]['placement_parent_id'] !== null) {
        $p = (int) $tree[$node]['placement_parent_id']; $side = $tree[$node]['placement_side']; $node = $p;
        if (empty($isActive[$p])) continue;
        $carry[$p][$side] = ($carry[$p][$side] ?? 0) + 1;
        if (($carry[$p]['L'] ?? 0) >= 1 && ($carry[$p]['R'] ?? 0) >= 1) { $carry[$p]['L']--; $carry[$p]['R']--; $cand[$p] = true; }
    }
    $leg = $u; $cur = $sp; // enrollment
    while ($cur !== null) {
        if (empty($isActive[$cur])) break;
        $legs[$cur][$leg] = ($legs[$cur][$leg] ?? 0) + 1;
        $open = array_filter($legs[$cur], fn ($c) => $c > 0);
        uksort($open, fn ($a, $b) => [$open[$b], $a] <=> [$open[$a], $b]);
        if (count($open) >= 2) { foreach (array_slice(array_keys($open), 0, 2) as $l) $legs[$cur][$l]--; $cand[$cur] = true; }
        $leg = $cur; $cur = $tree[$cur]['sponsor_id'] !== null ? (int) $tree[$cur]['sponsor_id'] : null;
    }
    $n = 0;
    foreach (array_keys($cand) as $b) {
        if (++$n > 11) break;
        // Daily cap ৳5,000 per ID: excess of this event is flushed, the event still counts.
        // Cap is per ID per business day (multi-day Test Lab runs reset it each day).
        $dk = $b . '|' . $s['day'];
        $pay = max(0.0, min(150 / 2 ** ($n - 1), 5000 - ($daily[$dk] ?? 0)));
        $daily[$dk] = ($daily[$dk] ?? 0) + $pay;
        if ($pay > 0) $add($b, 'MATCHING', $pay);
    }
    $saleMatch[$sid] = min(11, $n);
}

// ---------- 3. Compare with the real ledger ----------
$act = []; foreach (DB::all("SELECT user_id, ledger_type, SUM(amount) a FROM lo_ledger WHERE status='PAID' GROUP BY user_id, ledger_type") as $r) $act[(int) $r['user_id']][$r['ledger_type']] = (float) $r['a'];
$mismatch = [];
foreach (array_unique(array_merge(array_keys($exp), array_keys($act))) as $u) {
    foreach (['CASHBACK', 'REFERRAL', 'GENERATION', 'MATCHING'] as $t) {
        $e = round($exp[$u][$t] ?? 0, 6); $a = round($act[$u][$t] ?? 0, 6);
        if (abs($e - $a) > 0.000002) $mismatch[$t][] = "user $u expected $e got $a";
    }
}
foreach (['CASHBACK' => '৳100 service cashback per activation', 'REFERRAL' => '৳200 direct referral to direct sponsor only', 'GENERATION' => '10-generation bonus 50/30/25/20/18/15/12/10/10/10', 'MATCHING' => 'matching 150 halving, one payout per beneficiary per sale'] as $t => $label) {
    check("$label — every account matches the plan", empty($mismatch[$t]), implode('; ', array_slice($mismatch[$t] ?? [], 0, 5)));
}
$unpaid = DB::all("SELECT u.id FROM users u JOIN lo_tree t ON t.user_id=u.id LEFT JOIN lo_activations a ON a.user_id=u.id AND a.payment_status='SUCCESS' WHERE a.id IS NULL AND t.sponsor_id IS NOT NULL");
$unpaidEarn = 0; foreach ($unpaid as $r) $unpaidEarn += array_sum($act[(int) $r['id']] ?? []);
check(count($unpaid) . ' unpaid accounts earned nothing', $unpaidEarn == 0);
$bad = DB::all("SELECT activation_id, SUM(amount) s FROM lo_allocations GROUP BY activation_id HAVING ABS(s-1000) > 0.000001");
check('each ৳1,000 activation allocated 100/200/300/200/200', count($bad) === 0);
check('no sale paid more than ৳299.854 matching or 11 events', (int) DB::val('SELECT COUNT(*) FROM lo_sales WHERE matching_paid > 299.854001 OR matching_count > 11') === 0);
check('one matching decision per sale+beneficiary', (int) DB::val('SELECT COUNT(*) FROM (SELECT sale_id, beneficiary_id FROM lo_matching_events GROUP BY sale_id, beneficiary_id HAVING COUNT(*)>1) x') === 0);
check('daily matching cap ৳5,000 never exceeded', (int) DB::val('SELECT COUNT(*) FROM lo_daily_caps WHERE paid > 5000') === 0);
$per = []; foreach (DB::all('SELECT sale_id, COUNT(*) c FROM lo_matching_events GROUP BY sale_id') as $r) $per[(int) $r['sale_id']] = (int) $r['c'];
$evMis = 0; foreach ($saleMatch as $sid => $n) if (($per[$sid] ?? 0) !== $n) $evMis++;
check('matching event count per sale matches plan model', $evMis === 0, "$evMis sales differ");
check('binary carry never negative', (int) DB::val('SELECT COUNT(*) FROM lo_tree WHERE left_carry<0 OR right_carry<0') === 0);
check('every consumed volume unit used in exactly one pair', (int) DB::val("SELECT COUNT(*) FROM lo_volumes v WHERE v.status='CONSUMED' AND (SELECT COUNT(*) FROM lo_volume_pairs p WHERE p.first_volume_id=v.id OR p.second_volume_id=v.id) <> 1") === 0);
$maxGen = 0; foreach ($sales as $s) { $d = 0; $c = $tree[(int) $s['user_id']]['sponsor_id']; while ($c !== null) { $d++; $c = $tree[(int) $c]['sponsor_id']; } $maxGen = max($maxGen, $d); }
check("tree reaches generation depth $maxGen (≥10 needed to test all 10 levels)", $maxGen >= 10);

$tot = DB::one("SELECT SUM(CASE WHEN ledger_type='CASHBACK' THEN amount END) cb, SUM(CASE WHEN ledger_type='REFERRAL' THEN amount END) ref, SUM(CASE WHEN ledger_type='GENERATION' THEN amount END) gen, SUM(CASE WHEN ledger_type='MATCHING' THEN amount END) mat FROM lo_ledger WHERE status='PAID'");
echo "\nAccounts: " . count($accounts) . ", paid activations: " . count($sales) . ", matching events: " . (int) DB::val('SELECT COUNT(*) FROM lo_matching_events') . "\n";
echo "Totals ৳ — cashback {$tot['cb']}, referral {$tot['ref']}, generation {$tot['gen']}, matching {$tot['mat']}\n";
echo "\n$pass checks passed, $fail failed\n";
exit($fail ? 1 : 0);
