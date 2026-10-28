<?php
declare(strict_types=1);
// CLI only: no public payout endpoint or web-triggered execution.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/src/bootstrap.php';

$execute = false;
$batch = 100;
foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--execute') $execute = true;
    elseif ($arg === '--dry-run') $execute = false;
    elseif (preg_match('/^--batch=(\d+)$/', $arg, $match)) $batch = (int) $match[1];
    else { fwrite(STDERR, "Usage: php settle.php [--dry-run|--execute] [--batch=1..1000]\n"); exit(2); }
}
try {
    $result = \LifeOS\Engine\Settlement::run($execute, $batch);
    echo json_encode($result, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(($result['failed'] ?? 0) > 0 ? 1 : 0);
} catch (\Throwable $error) {
    fwrite(STDERR, "Settlement refused or unavailable; verify approved configuration and private server logs.\n");
    exit(1);
}