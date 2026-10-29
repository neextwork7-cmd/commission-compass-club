<?php
declare(strict_types=1);
namespace LifeOS;

final class Cron
{
    public static function baseUrl(string $url): string
    {
        $parts = parse_url($url);
        if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment']) || preg_match('/[\s\x00-\x1f]/', $url)) {
            throw new HttpError('Cron base URL must be an HTTPS backend URL without credentials or query', 422);
        }
        return rtrim($url, '/');
    }

    public static function status(): array
    {
        $configured = (string) Config::get('cron_base_url', '');
        $base = $configured === '' ? null : self::baseUrl($configured);
        $enabled = Config::get('commission_cron_enabled', false) === true;
        $approved = DB::val("SELECT v FROM lo_settings WHERE k='financial_release_approved'") === '1';
        $last = DB::val("SELECT v FROM lo_settings WHERE k='cron_last_run'");
        $path = LIFEOS_ROOT . '/bin/settle.php';
        $bridge = LIFEOS_ROOT . '/bin/cron-http.php';
        return ['url' => $base ? $base . '/api/public/cron/settle' : null,
            'endpoint_path' => '/api/public/cron/settle', 'timezone' => 'Asia/Dhaka', 'schedule' => '* * * * *',
            'server_enabled' => $enabled, 'finance_approved' => $approved,
            'mode' => Config::get('cron_http_execute', false) === true ? 'execute' : 'dry-run',
            'last_run' => $last ? json_decode((string) $last, true) : null,
            'cli_command' => '/usr/local/bin/php ' . escapeshellarg($path) . ($enabled && $approved ? ' --execute' : ' --dry-run') . ' --batch=100',
            'url_command' => '/usr/local/bin/php ' . escapeshellarg($bridge),
            'scheduler_verified' => false,
            // Software date follows the Test Lab clock when it is on.
            'software_date' => (string) DB::val('SELECT CURRENT_DATE()'),
            'matching_total' => \LifeOS\Engine\MatchingStats::split(),
            'matching_today' => \LifeOS\Engine\MatchingStats::split(null, (string) DB::val('SELECT CURRENT_DATE()')),
            'matching_last_day' => \LifeOS\Engine\MatchingStats::split(null, (string) DB::val('SELECT CURRENT_DATE() - INTERVAL 1 DAY'))];
    }
}