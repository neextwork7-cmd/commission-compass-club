<?php
declare(strict_types=1);
use LifeOS\Auth;
use LifeOS\Cron;
use LifeOS\DB;
use LifeOS\Http;
use LifeOS\HttpError;
use LifeOS\MasterAuth;
use LifeOS\Engine\Settlement;

$router->get('/api/admin/cron', function () {
    Auth::admin();
    Http::ok(Cron::status());
});

// URL contains no credentials. Scheduler signs each invocation server-side.
$router->post('/api/public/cron/settle', function () {
    $path = Http::path();
    $query = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY);
    if (is_string($query) && $query !== '') $path .= '?' . $query;
    MasterAuth::verify('POST', $path);
    $body = Http::body();
    $mode = $body['mode'] ?? 'dry-run';
    $batch = $body['batch'] ?? 100;
    if (!in_array($mode, ['dry-run', 'execute'], true) || !is_int($batch) || $batch < 1 || $batch > 1000) throw new HttpError('Invalid cron mode or batch', 422);
    $result = Settlement::run($mode === 'execute', $batch);
    $record = ['at' => date(DATE_ATOM), 'result' => $result];
    DB::run("INSERT INTO lo_settings (k,v) VALUES ('cron_last_run',?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [json_encode($record)]);
    MasterAuth::audit('cron.settle', $mode, ($result['failed'] ?? 0) === 0);
    Http::ok($result);
});
// ---- Admin Test Lab: only when test_lab_enabled=true in runtime config ----
$router->get('/api/admin/test-lab', function () {
    Auth::admin();
    Http::ok(\LifeOS\TestLab::status());
});
$router->post('/api/admin/test-lab/run-day', function () {
    Auth::admin();
    Http::ok(\LifeOS\TestLab::runDay() + ['status' => \LifeOS\TestLab::status()]);
});
$router->post('/api/admin/test-lab/reset', function () {
    Auth::admin();
    $b = Http::body();
    if (($b['confirm'] ?? '') !== 'RESET') throw new HttpError('Type RESET to confirm', 422);
    // Reset only clears data and returns to today's date; members are created by the separate Create button.
    $out = \LifeOS\TestLab::reset();
    Http::ok($out + ['status' => \LifeOS\TestLab::status()]);
});
$router->get('/api/admin/test-lab/logins', function () {
    Auth::admin();
    Http::ok(['password' => 'test1234', 'members' => \LifeOS\TestLab::logins()]);
});
$router->post('/api/admin/test-lab/seed', function () {
    Auth::admin();
    Http::ok(\LifeOS\TestLab::seed(300) + ['status' => \LifeOS\TestLab::status()]);
});
