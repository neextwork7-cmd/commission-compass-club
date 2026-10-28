<?php
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';
require __DIR__ . '/captcha_helpers.php';
use LifeOS\Captcha;
use LifeOS\HttpError;
$count = 0;
function expectRejected(callable $fn): void {
    try { $fn(); } catch (HttpError $e) { if ($e->status === 422) return; throw $e; }
    throw new RuntimeException('Expected rejection');
}
function rule(string $name, callable $fn): void { global $count; $fn(); $count++; echo "ok $name\n"; }
rule('missing challenge rejected', fn() => expectRejected(fn() => Captcha::verify(null, '7148')));
rule('four-digit code accepted once', function () { $c = captchaBody(); Captcha::verify($c['challenge_id'], '7148'); expectRejected(fn() => Captcha::verify($c['challenge_id'], '7148')); });
rule('wrong code consumes challenge', function () { $c = captchaBody(); expectRejected(fn() => Captcha::verify($c['challenge_id'], '0000')); expectRejected(fn() => Captcha::verify($c['challenge_id'], '7148')); });
rule('only four digits accepted', function () { $c = captchaBody(); expectRejected(fn() => Captcha::verify($c['challenge_id'], '714')); });
rule('expired code rejected', function () { $m = new ReflectionMethod(Captcha::class, 'create'); $c = $m->invoke(null, '7148', time() - 1); expectRejected(fn() => Captcha::verify($c['challenge_id'], '7148')); });
rule('fresh challenge returns an image and no answer', function () { $c = Captcha::issue(); [$head, $b64] = explode(',', $c['image'], 2); $raw = base64_decode($b64); $ok = ($head === 'data:image/png;base64' && str_starts_with($raw, "\x89PNG")) || ($head === 'data:image/svg+xml;base64' && str_starts_with($raw, '<svg') && !str_contains($raw, '<text')); if (!$ok || array_keys($c) !== ['challenge_id', 'image']) throw new RuntimeException('Invalid public challenge'); });
echo "$count captcha checks passed\n";