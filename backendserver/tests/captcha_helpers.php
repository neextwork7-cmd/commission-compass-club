<?php
declare(strict_types=1);

// Isolated PHP tests can create a known challenge directly, never through an API bypass.
function captchaBody(): array {
    $create = new ReflectionMethod(\LifeOS\Captcha::class, 'create');
    $challenge = $create->invoke(null, '7148', time() + 300);
    return ['challenge_id' => $challenge['challenge_id'], 'security_code' => '7148'];
}