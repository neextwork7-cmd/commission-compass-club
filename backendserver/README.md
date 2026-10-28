# Life OS Backend Server (PHP + MySQL)

Self-contained REST API for the Life OS member panel. Deploy this folder to any
PHP 8.1+ host with MySQL (e.g. cPanel). No framework, no Composer.

## Setup

1. Copy `config.example.php` to `config.php` and fill in DB credentials,
   `app_secret` (64+ random chars) and `master_key` (64+ random chars, server-to-server only).
2. Start Apache and MySQL in XAMPP. The configured MySQL account must have CREATE permission.
   On first database access, the API creates the configured database if missing and applies ordered migrations.
   Existing databases, tables, accounts and settings are preserved. The legacy archive's DROP and sample INSERT statements are never executed by automatic setup.
   Set `auto_setup` to false for manually provisioned hosting. Signed `POST /api/master/db/migrate` uses the same safe migration runner.
3. Point the web root (or an Alias) at this folder; `index.php` + `.htaccess` route everything.

For the XAMPP tunnel at `https://deserver.neexthub.site/lifeos/backendserver/`, ensure Apache AllowOverride permits `.htaccess`, PHP 8.1+ has pdo_mysql enabled, and `cors_origins` in the private server config includes the actual app origin. Never allow every origin. `config.php` is not pushed or overwritten.

## Signed remote updates

Set `LIFEOS_MASTER_KEY` securely in the command environment to the server's existing master key, then run `python3 scripts/master-update.py`. It verifies signed connectivity, sends only the setup update files (no config, storage or tests), and calls safe migrations. `--check` only checks connectivity. No private key is stored in source. A failed migration does not roll back database DDL; fix the migration and retry. Back up production data before applying changes.

## Every-minute commission recovery and daily closing

`php /absolute/path/backendserver/bin/settle.php --dry-run` reports verified SUCCESS,
unprocessed activations and unfinished past-day statements without paying anything.
After historical reconciliation and Finance/Admin approval, set
`commission_cron_enabled => true` in the server's private `config.php`, record
`financial_release_approved=1` in the existing server settings only after that
approval, and schedule:

```cron
* * * * * /usr/bin/php /absolute/path/backendserver/bin/settle.php --execute --batch=100 >> /absolute/private/logs/lifeos-settlement.log 2>&1
```

For XAMPP/Windows, Task Scheduler should run `C:\xampp\php\php.exe` with arguments
`C:\xampp\htdocs\lifeos\backendserver\bin\settle.php --execute --batch=100`,
repeating every 1 minute indefinitely. Adjust paths to the actual installation.
Use the existing backend configuration; no credentials go in scheduled arguments.
This repository does not install or activate the remote host's scheduler.

### Admin Cron Setup / cPanel URL

Open Configs → Cron Setup in the authenticated admin panel for current approval
status, last signed URL invocation and copyable commands. Configure `cron_base_url`
as the public HTTPS backend base in private config.php. The URL is that base plus
`/api/public/cron/settle`. It requires POST with Master HMAC headers and never accepts
a key in the URL. `bin/cron-http.php` signs requests using the existing private master
key and refuses redirects. In cPanel Cron Jobs choose Once Per Minute and use
`/usr/local/bin/php '/absolute/backendserver/bin/cron-http.php'`. Keep
`cron_http_execute=false` for dry-run monitoring. Changing it to true does not bypass
either financial release gate. No scheduler credentials are shown to admins.

The runner is CLI-only, bounded, guarded by a database-wide advisory lock and uses
the existing transaction/activation replay guard. Failed items retry next minute;
nonzero exit indicates a failure. Statements close after Dhaka midnight and catch
up after downtime, once per member/day, independently of payments. No sale counter
resets, existing statements change, or rank gifts/withdrawals run automatically.

Payment confirmation still settles synchronously; this is a recovery runner, not
a new time-accrual engine. Paused matching carries, legacy source-sale liability
and refunded-volume reconciliation require approved policy before automated
backlog matching can be implemented. Do not enable production execution merely
because these recovery checks pass.

## Marketing plan constants (fixed by business plan)

Activation ৳1,000 = 1000 BV, split: Cashback ৳100 (service-only, not withdrawable),
Direct Referral ৳200 (direct sponsor only), Matching Reserve ৳300 (max payable
৳299.854 across max 11 events per sale: 150, 75, 37.5, … halving), Generation
Pool ৳200 (10 generations: 50/30/25/20/18/15/12/10/10/10), Rank Pool ৳200.
Daily matching cap ৳5,000 per active ID. Enrollment tree and binary placement
tree are separate; each matching calculates both bills but pays only the larger
one. Consumed volume is never reused; counters never reset on date change.

## API overview

- `POST /api/member/register|login`, `GET /api/member/me|wallet|ledger|tree/binary|tree/enrollment|activations|matching|rank|withdrawals`, `POST /api/member/activations|withdrawals`
- `POST /api/admin/login`, `GET /api/admin/overview|members|withdrawals|matching-events`, `POST /api/admin/activations/{id}/confirm` (only SUCCESS pays), `members/{id}/status`, `withdrawals/{id}/process`, `settings`, `adjustments`
- Master Worker (HMAC-signed, audited): `GET /api/master/ping|files/list|files/read|db/tables|audit`, `POST /api/master/files/write|files/delete|db/query|db/migrate|deploy|rollback`

Master signature headers: `X-Master-Ts` (unix time, ±5 min), `X-Master-Sig` =
`HMAC_SHA256(master_key, "{ts}.{METHOD}.{path}.{sha256(raw body)}")`.
`deploy` writes a file set atomically with backup to `storage/backups/deploy-<ts>/`
and automatic rollback on failure; `rollback` restores a previous deploy.
