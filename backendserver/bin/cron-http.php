<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/src/bootstrap.php';
try {
    $base = \LifeOS\Cron::baseUrl((string) \LifeOS\Config::get('cron_base_url', ''));
    $key = (string) \LifeOS\Config::get('master_key', '');
    if ($key === '' || $key === 'change-me-master-key') throw new RuntimeException('Not configured');
    $path = '/api/public/cron/settle';
    $body = json_encode(['mode' => \LifeOS\Config::get('cron_http_execute', false) === true ? 'execute' : 'dry-run', 'batch' => 100]);
    $ts = (string) time();
    $signature = hash_hmac('sha256', "$ts.POST.$path." . hash('sha256', $body), $key);
    $curl = curl_init($base . $path);
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => 50, CURLOPT_USERAGENT => 'LifeOS-Master-Updater/1.0',
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', "X-Master-Ts: $ts", "X-Master-Sig: $signature"]]);
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    $result = is_string($raw) ? json_decode($raw, true) : null;
    if ($status !== 200 || !is_array($result) || ($result['ok'] ?? false) !== true) throw new RuntimeException('Invocation failed');
    echo json_encode($result['data']) . PHP_EOL;
    exit(($result['data']['failed'] ?? 0) > 0 ? 1 : 0);
} catch (Throwable $error) {
    fwrite(STDERR, "Cron request failed; check HTTPS URL, private configuration and financial approval.\n");
    exit(1);
}