<?php
// Non-secret cron switches. Finance release is still controlled by the admin setting.
return [
    'commission_cron_enabled' => true,
    'cron_http_execute' => true,
    // Admin Test Lab (reset/seed/one-day run). Turn off before real members join.
    'test_lab_enabled' => true,
    'cron_base_url' => 'https://server.nexarofx.com/lifeos/backendserver',
];
