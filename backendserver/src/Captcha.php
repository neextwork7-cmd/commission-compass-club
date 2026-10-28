<?php
declare(strict_types=1);

namespace LifeOS;

/** Short-lived, single-use challenges. Answers never leave the PHP service. */
final class Captcha
{
    public static function issue(): array
    {
        return self::create(str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT), time() + 300);
    }

    private static function directory(): string
    {
        $dir = sys_get_temp_dir() . '/lifeos-captcha-' . substr(hash('sha256', LIFEOS_ROOT), 0, 16);
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) throw new HttpError('Security code unavailable', 503);
        return $dir;
    }

    private static function create(string $code, int $expires): array
    {
        $id = bin2hex(random_bytes(24));
        // Hosts without the GD extension get an equivalent vector image drawn from strokes, never text glyphs.
        $image = extension_loaded('gd') ? 'data:image/png;base64,' . base64_encode(self::png($code)) : 'data:image/svg+xml;base64,' . base64_encode(self::svg($code));
        $dir = self::directory();
        // Bounded lifetime for abandoned challenges; no public file URLs.
        foreach (glob($dir . '/*.json') ?: [] as $old) {
            if (filemtime($old) < time() - 600) @unlink($old);
        }
        $path = $dir . '/' . $id . '.json';
        $record = json_encode(['expires' => $expires, 'hash' => hash_hmac('sha256', $id . '.' . $code, (string) Config::get('app_secret'))]);
        $handle = @fopen($path, 'x');
        if (!$handle) throw new HttpError('Security code unavailable', 503);
        chmod($path, 0600);
        fwrite($handle, (string) $record); fclose($handle);
        return ['challenge_id' => $id, 'image' => $image];
    }

    private static function png(string $code): string
    {
        $image = imagecreatetruecolor(140, 30);
        $blue = imagecolorallocate($image, 8, 62, 136);
        $white = imagecolorallocate($image, 255, 255, 255);
        imagefill($image, 0, 0, $blue);
        foreach (str_split($code) as $i => $digit) {
            $glyph = imagecreatetruecolor(24, 26);
            imagefill($glyph, 0, 0, $blue);
            imagestring($glyph, 5, 7, 5, $digit, $white);
            $rotated = imagerotate($glyph, random_int(-20, 20), $blue);
            imagecopy($image, $rotated, 12 + $i * 30, 0, 0, 0, min(30, imagesx($rotated)), min(30, imagesy($rotated)));
            imagedestroy($glyph); imagedestroy($rotated);
        }
        ob_start(); imagepng($image); $png = (string) ob_get_clean(); imagedestroy($image);
        return $png;
    }

    /** Seven-segment strokes per digit (a,b,c,d,e,f,g). */
    private const SEGMENTS = ['0' => 'abcdef', '1' => 'bc', '2' => 'abged', '3' => 'abgcd', '4' => 'fgbc',
        '5' => 'afgcd', '6' => 'afgedc', '7' => 'abc', '8' => 'abcdefg', '9' => 'abcdfg'];

    private static function svg(string $code): string
    {
        $lines = ['a' => [0, 0, 10, 0], 'b' => [10, 0, 10, 9], 'c' => [10, 9, 10, 18], 'd' => [0, 18, 10, 18],
            'e' => [0, 9, 0, 18], 'f' => [0, 0, 0, 9], 'g' => [0, 9, 10, 9]];
        $j = fn () => random_int(-8, 8) / 10;
        $out = '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="30" viewBox="0 0 140 30"><rect width="140" height="30" fill="#083E88"/>';
        for ($n = 0; $n < 3; $n++) {
            $out .= sprintf('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#2f62a8" stroke-width="1"/>', random_int(0, 40), random_int(0, 30), random_int(100, 140), random_int(0, 30));
        }
        foreach (str_split($code) as $i => $digit) {
            $d = '';
            foreach (str_split(self::SEGMENTS[$digit]) as $seg) {
                [$x1, $y1, $x2, $y2] = $lines[$seg];
                $d .= sprintf('M%.1f %.1fL%.1f %.1f', $x1 + $j(), $y1 + $j(), $x2 + $j(), $y2 + $j());
            }
            $x = 18 + $i * 30 + random_int(-2, 2);
            $y = 6 + random_int(-1, 1);
            $out .= sprintf('<path transform="translate(%d %d) rotate(%d 5 9)" d="%s" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>', $x, $y, random_int(-20, 20), $d);
        }
        return $out . '</svg>';
    }

    public static function verify(mixed $id, mixed $code): void
    {
        if (!is_string($id) || !preg_match('/^[a-f0-9]{48}$/', $id)) throw new HttpError('Invalid or expired security code', 422);
        $path = self::directory() . '/' . $id . '.json';
        $handle = @fopen($path, 'r+');
        if (!$handle) throw new HttpError('Invalid or expired security code', 422);
        flock($handle, LOCK_EX);
        $record = json_decode((string) stream_get_contents($handle), true);
        // Truncate under the lock: concurrent attempts cannot reuse this challenge.
        ftruncate($handle, 0); fflush($handle);
        flock($handle, LOCK_UN); fclose($handle); @unlink($path);
        $valid = is_string($code) && preg_match('/^\d{4}$/', $code)
            && is_array($record) && ($record['expires'] ?? 0) > time()
            && hash_equals((string) ($record['hash'] ?? ''), hash_hmac('sha256', $id . '.' . $code, (string) Config::get('app_secret')));
        if (!$valid) throw new HttpError('Invalid or expired security code', 422);
    }
}