# Marketing plan audit — 2026-10-28

## Result

Not fully compliant for production release. The existing activation commissions
work in the tested scenarios, but periodic future matching and historical funding
reconciliation are not yet established. No live financial data or settings were
changed, and no remote scheduler was installed.

## Fresh verified coverage

- Disposable PHP/MySQL API suite: 122 checks passed. Includes registration, access,
  successful activation, two tree bills/one payout, referral/generation/cashback,
  allocation records, matching cap flush, refunds, withdrawal and signed API checks.
- Team registration: 42 checks passed. Formula tests: 11 passed. Captcha: 6 passed.
- New minute runner: 17 checks passed, including Dhaka midnight, dry-run, two
  approval gates, SUCCESS recovery, payment exclusion, duplicate replay, immutable
  statement close, overlapping worker lock, failed ledger rollback and retry.
- Frontend: 3 tests passed. Packaging: 2 passed. Existing policy/path/setup tests passed.
- Browser: real isolated PHP member and admin logins, 17 member views, 20 admin
  views and 27 fixed public routes visited; no failed API requests, broken loaded
  images or browser exceptions in that run. Daily close submitted and result read
  back through the UI. This is not every button/form tested; dynamic service paths,
  external payment providers and live funded-account interactions remain unverified.
- Seven read-only live aggregate checks returned zero violations: allocation totals,
  sale cap/event count, daily cap, duplicate event identities, unprocessed SUCCESS,
  refunded carry and net per-activation paid liability over 1000. These aggregates
  do not constitute historical source-pair reconciliation or prove production readiness.

## Implemented scheduler

`bin/settle.php` is CLI-only. Dry-run is default. Execution requires both private
server opt-in and existing financial release approval. Each minute it recovers
verified, unprocessed SUCCESS activations using the existing transaction engine.
It closes unfinished previous-day statements after Dhaka midnight, catches up
after downtime, and never edits an existing closed statement or resets sale counts.
Advisory locking prevents overlapping runner instances; activation locks and
processed flags retain replay protection against synchronous payment confirmation.
The README contains Linux cron and XAMPP Windows Task Scheduler instructions.

## Remaining plan gaps / release blockers

1. **Future source-sale matching:** current decisions are keyed by sale+beneficiary,
   preventing later distinct decisions for that same combination. Matching happens
   only during activation. Paused matching carry is not drained by this runner.
   A durable eligible-event identity and approved source-sale funding selection
   are needed before a backlog engine can safely generate later events.
2. **Funding/provenance:** pair rows preserve source IDs, but payouts charge the
   triggering sale. Legacy carries can lack source rows. Audited volume identity
   alone does not prove liability is charged to the authorized source reserve.
3. **Refunds:** ledger reversals are tested, but invalidating all refunded carries,
   downstream pair effects, pool balances and cap/reserve reinstatement are not
   fully reconciled. Historical entries must not be deleted or guessed into place.
4. **Bills/reporting:** runtime bills equal the current event schedule; unequal
   higher-bill selection is tested at formula level, not a real independent bill
   calculator. Binary/enrollment bills are separate; actual payouts share MATCHING
   with a selected-type record rather than separate payout ledger types.
5. **Approval ambiguity:** uploaded rank tables conflict; preserve the previously
   approved first list. Historical inactivity and source-liability policies still
   require an explicit decision. Cap-excess matched points flush; that is distinct
   from genuine unmatched carry and does not entitle a flushed event to repayment.
6. **Coverage limits:** true parallel payout contention against a final daily cap,
   historical midnight event replay, funded live member/admin flows, external
   gateway authenticity and a complete historical simulation remain unverified.
7. **Account display:** tested paid-active tree accounts can still display legacy
   users.status as pending. This audit does not change lifecycle/access policy.

Do not enable production payout execution until these critical rules are resolved,
historical liabilities reconcile and Finance/Admin approves. Running every minute
does not create new commission entitlement from elapsed time.