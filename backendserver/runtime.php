<?php
// Non-secret cron switches. Finance release is still controlled by the admin setting.
return [
    'commission_cron_enabled' => true,
    'cron_http_execute' => true,
    // Admin Test Lab (reset/seed/one-day run) is OFF: real members are loaded; Reset would delete them.
    'test_lab_enabled' => false,
    'cron_base_url' => 'https://server.nexarofx.com/lifeos/backendserver',
];
