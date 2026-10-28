<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
use LifeOS\Config;
use LifeOS\DB;
use LifeOS\Engine\Settlement;
use LifeOS\Engine\Statements;

function check(bool $ok, string $name): void {
    if (!$ok) throw new RuntimeException($name);
    echo "PASS: $name\n";
}
$before = new DateTimeImmutable('2026-10-28T17:59:59Z');
$after = new DateTimeImmutable('2026-10-28T18:00:00Z');
check(!Statements::isFinishedDate('2026-10-28', $before), 'Dhaka current day cannot close before midnight');
check(Statements::isFinishedDate('2026-10-28', $after), 'Dhaka previous day can close at midnight');
check(!Statements::isFinishedDate('2026-02-30', $after), 'Impossible statement dates rejected');
if (!getenv('LIFEOS_SETTLEMENT_TEST_PORT')) exit;
// Explicit disposable local DB only; never use the project's live config.
$port = (int) getenv('LIFEOS_SETTLEMENT_TEST_PORT');
if ($port !== 3307) throw new RuntimeException('Use disposable local port 3307');
$config = new ReflectionProperty(Config::class, 'c');
$local = ['db'=>['host'=>'127.0.0.1','port'=>$port,'name'=>'lifeos','user'=>'root','pass'=>''], 'auto_setup'=>true,'commission_cron_enabled'=>false];
$config->setValue(null, $local);
try { Settlement::run(true); $blocked = false; } catch (\LifeOS\HttpError $error) { $blocked = $error->status === 403; }
check($blocked, 'Execution disabled unless explicitly approved');
$user = (int) DB::val('SELECT user_id FROM lo_tree ORDER BY user_id LIMIT 1');
check($user > 0, 'Integration fixture contains registered member');
$activation = DB::insert("INSERT INTO lo_activations (activation_code,user_id,payment_ref,payment_status) VALUES (?,?,?,'SUCCESS')", ['CRON-QA-1',$user,'CRON-QA-PAY-1']);
$ledgerBefore = (int) DB::val('SELECT COUNT(*) FROM lo_ledger');
$dry = Settlement::run();
check($dry['eligible_activations'] >= 1 && (int) DB::val('SELECT processed FROM lo_activations WHERE id=?',[$activation]) === 0 && (int) DB::val('SELECT COUNT(*) FROM lo_ledger') === $ledgerBefore, 'Dry run never credits commissions');
$local['commission_cron_enabled'] = true;
$config->setValue(null,$local);
try { Settlement::run(true); $blocked = false; } catch (\LifeOS\HttpError $error) { $blocked = $error->status === 403; }
check($blocked, 'Server opt-in alone cannot bypass financial release approval');
DB::run("UPDATE lo_settings SET v='1' WHERE k='financial_release_approved'");
$run = Settlement::run(true);
check($run['failed'] === 0 && (int) DB::val('SELECT processed FROM lo_activations WHERE id=?',[$activation]) === 1, 'Verified SUCCESS activation recovered');
$paid = (int) DB::val('SELECT COUNT(*) FROM lo_ledger');
$counter = DB::one('SELECT matching_count,matching_paid FROM lo_sales WHERE activation_id=?',[$activation]);
Settlement::run(true);
check((int) DB::val('SELECT COUNT(*) FROM lo_ledger') === $paid && DB::one('SELECT matching_count,matching_paid FROM lo_sales WHERE activation_id=?',[$activation]) === $counter, 'Minute replay never repays or resets sale counter');
$pending = DB::insert("INSERT INTO lo_activations (activation_code,user_id,payment_ref,payment_status) VALUES (?,?,?,'PENDING')",['CRON-QA-PENDING',$user,'CRON-QA-PAY-PENDING']);
Settlement::run(true);
check((int) DB::val('SELECT processed FROM lo_activations WHERE id=?',[$pending]) === 0, 'Pending payment never processed by cron');
DB::run("UPDATE lo_activations SET payment_status='FAILED' WHERE id=?",[$pending]);
Settlement::run(true);
check((int) DB::val('SELECT processed FROM lo_activations WHERE id=?',[$pending]) === 0, 'Failed payment never processed by cron');
$yesterday = date('Y-m-d',strtotime('-1 day'));
$event = DB::one('SELECT event_code FROM lo_matching_events ORDER BY created_at DESC LIMIT 1');
check($event !== null, 'Fixture has a matching event');
DB::run('UPDATE lo_matching_events SET created_at=? WHERE event_code=?',[$yesterday.' 23:45:00',$event['event_code']]);
$result = Settlement::run(true);
check($result['statements_closed'] >= 1, 'Past-day statements automatically close');
$statements = DB::all('SELECT * FROM lo_statements ORDER BY statement_code');
Settlement::run(true);
check(DB::all('SELECT * FROM lo_statements ORDER BY statement_code') === $statements, 'Closed statements never change on replay');
$lock = 'lifeos:settlement:lifeos';
$other = new PDO("mysql:host=127.0.0.1;port=$port;dbname=lifeos",'root','');
$other->query("SELECT GET_LOCK('$lock',0)");
check(Settlement::run(true)['status'] === 'busy', 'Overlapping worker refused under shared database lock');
$other->query("SELECT RELEASE_LOCK('$lock')");
// Force ledger failure and prove all allocation/sale changes roll back, then retry.
$broken = DB::insert("INSERT INTO lo_activations (activation_code,user_id,payment_ref,payment_status) VALUES (?,?,?,'SUCCESS')",['CRON-QA-RETRY',$user,'CRON-QA-PAY-RETRY']);
DB::run("CREATE TRIGGER qa_fail_ledger BEFORE INSERT ON lo_ledger FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='isolated failure'");
try {
    $failed = Settlement::run(true);
    check($failed['failed'] === 1 && (int) DB::val('SELECT COUNT(*) FROM lo_sales WHERE activation_id=?',[$broken]) === 0 && (int) DB::val('SELECT processed FROM lo_activations WHERE id=?',[$broken]) === 0, 'Ledger failure rolls back sale and leaves retryable activation');
} finally { DB::run('DROP TRIGGER qa_fail_ledger'); }
check(Settlement::run(true)['failed'] === 0 && (int) DB::val('SELECT processed FROM lo_activations WHERE id=?',[$broken]) === 1, 'Failed activation retries successfully next run');