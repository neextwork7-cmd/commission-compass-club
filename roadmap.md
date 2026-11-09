# Current cPanel deployment request
- [x] Build portable root-domain cPanel package: same-origin /backendserver/api, TanStack SPA shell, Apache fallback, configuration template and all eight migrations; no credentials, live config or database dump.
- [x] Six frontend tests and two existing packaging tests pass; exported home/About/login/admin login and protected redirects tested; real packaged PHP captcha loads and refreshes with zero browser errors; all packaged PHP files lint; ZIP integrity/private-file audit passes. Hosting MySQL/login/commission execution needs installation and private configuration; Bangla instructions included.

# Current member wallet and activation request
- [x] Numeric-only captcha and actual package ID status.
- [x] Compact Cashback / Deposit / Withdraw / Total Balance cards.
- [x] Replace member transfer with fixed-package-price, deposit-only Active New ID; preserve transfer and package histories.
- [x] Remove enrollment BV Summary onward and matching rule text; retain matching reports.
- [x] 2026-11-09: signed live deployment and identical readback of Wallet/member/admin API + deposit migration; published frontend at binary-bloom-commissions.lovable.app. Real published admin/member login, deposit credit, fixed-price activation, both histories, ID status and matching/admin pages passed with zero browser errors; five live financial assertions, three frontend tests and two packaging tests passed. Four isolated QA members and two unsettled activations retained; Active New ID switch restored off. Automatic cron execution and unrelated historical roadmap items remain unverified this turn.

# Current live admin/member completion
- [x] Admin Cron/Test Lab: "Add 1 Day Sales" button (300 new paid, unsettled sales on current software date, keeps existing data); progress bar + percent for every Test Lab action.
- [x] 4-day live test (live = local, 16/16 plan checks; fixed live daily cap using real date instead of software date) with rank + Binary/Enrollment matching split on member dashboard, admin dashboard, cron page.
- [x] 2026-10-29: member background from neelnod PDF applied. Month run removed at user request; Test Lab = Reset (today, nothing created) / Create 300 Members (shows logins) / Run 1 Day (global date +1). Local flow 16/16 + independent plan checks 13/13; live reset + 300 members created, left unsettled for the client.
- [x] 2026-10-29: permanent live admin (username Admin) created; login by username deployed. Live browser test: all 22 admin and 20 member pages open with real data, no API errors. Live ledger re-check vs plan: 0 violations. Only issue: member page background picture missing in this remixed copy (cosmetic).
- [x] 2026-10-28 re-audit: fresh DB — plan simulation 18/18 (301 accounts, 25 cron runs), API 112/122 (10 failures only master-signature checks because backendserver/.env holds the live deploy key, not plan logic), team 42/42, captcha 6, plan rules, policy, settlement, cron pass. No code defects found.
- [x] Repeated largest-two Enrollment formula cancelled by user; keep the uploaded Marketing Plan's matching rules as implemented.
- [x] 2026-10-28 full plan simulation: ROOT + 300 accounts via real API, half settled by bin/settle.php cron runs; independent plan model matches every account's cashback/referral/generation/matching (incl. ৳5,000 daily cap). 122+42+11+17+6 suite checks pass. Data kept in backendserver/tests/fixtures/plan_simulation_300.*.
- [ ] Apply 2026-10-28 policy decisions: keep prior valid income after inactivity, fund later matching from paired original sales, cancel only unused refunded points automatically. Verify critical tests and historical funding reconciliation before enabling live commission; host scheduler access remains required.
- [x] Add Admin Configs → Cron Setup with copyable URL/commands, cPanel minute fields, Dhaka timezone, approval gates and last signed invocation. Eleven cron tests, three frontend tests and two packaging tests pass; real isolated admin login/copy/refresh verified with no browser errors. Six reviewed backend files deployed/read back; signed live URL dry-run succeeds with zero pending items and no payouts.
- [x] Audit uploaded Marketing Plan And User Account System: fresh 122 API checks, 42 team checks, 11 formula checks, 6 captcha checks, 17 runner checks, 3 frontend and 2 packaging tests pass; isolated real PHP logins and 17 member/20 admin/27 public route visits plus statement-close UI flow pass. Seven read-only live aggregate checks show zero violations. Full findings and coverage limits: backendserver/MARKETING_PLAN_AUDIT.md.
- [x] Build and test bounded CLI-only minute commission recovery with replay/concurrency protection, two explicit approval gates, retry/rollback and shared immutable Dhaka midnight statement closing; cron/XAMPP Task Scheduler setup documented, no live financial changes.
- [x] Requested live run: deployed only Statements.php, Settlement.php and bin/settle.php through signed Master API and read back all three identically. Live unprocessed SUCCESS count is zero and financial_release_approved is off; no payout execution, setting changes or scheduler installation performed.
- [x] Send remaining settlement update: deployed routes_admin.php, config.example.php, README.md and .htaccess with signed backups and identical readback. Live captcha 200, unsigned admin overview 401, direct bin/tests access 403; private config and financial settings untouched. Host rejects default Python user-agent requests (403), approved updater user-agent checks succeeded.
- [ ] Install every-minute job on external host: blocked on verified host scheduler access and Finance/Admin release approval after historical liability reconciliation; repository script alone does not run on that host.
- [ ] Complete future matching backlog and full plan-wide action testing: blocked on approved later-event/source-sale funding identity, conflicting rank/inactivity/refund policy and historical reconciliation. Recovery runner does not drain paused carries or generate new time-accrued entitlements.
- [x] Temporary live member lifecycle verified 2026-10-28: reused the uniquely marked detached QA account, confirmed zero wallet and no external references, completed real captcha login, visited all 17 member views with no failed API responses/broken images/browser errors, and verified tree details/Escape. Signed Master API atomically removed only its four users/profile/wallet/tree rows; all four absence checks passed, old session returns 403 and protected tree redirects to login. No existing accounts, placement or financial settings changed. This is pending-member read coverage, not funded-account/admin or financial-action verification; dashboard screenshot caught Loading and does not establish final dashboard presentation.
- [x] Current verification (2026-10-28): isolated PHP API suite 122/122, team join 42/42, captcha 6/6, standalone policy/plan/path/setup tests, setup integration and Python packaging tests pass; frontend 3/3. Browser performed actual captcha login, refreshed/rejected codes, read all 17 member views and 20 admin views against the isolated PHP service, and verified tree tap/keyboard/Escape/outside dismissal. Member tree/profile/transfer/recharge fit 393/889/1280px without overflow; no browser errors. No live financial updates.
- [x] Add reference-style four-digit member login captcha with real server validation; current live preview image loads, wrong-code rejection, refresh and valid login verified against isolated PHP accounts. Fresh authenticated reference login, dashboard, tree, profile, bonus, withdrawal, transfer and recharge captures reviewed; branding/plan differences retained.
- [ ] Complete exact reference parity for every remaining page: reference financial forms include additional security-code controls not present in Life OS, and activation has no established equivalent. Do not add cosmetic security bypasses; any additional server validation requires its own approved scope.
- [ ] Verify real external Life OS member/admin accounts end-to-end — requested again 2026-10-28: fresh browser redirects protected tree to login and live captcha image loads; no managed session or configured live test credentials available. Blocked on an authorized temporary test account; isolated-account checks do not establish production-account results. Live financial release remains blocked on policy approval.
- [ ] Diagnose and repair missing live activation tables with additive migration only; preserve existing accounts and financial records.
- [ ] Exercise authenticated live member/admin reads and safe reversible controls; document each failure and fix confirmed defects.
- [ ] Verify member/admin browser login and central flows against the real server; report financial-policy blockers without changing formulas.

# Member panel and external server
- [ ] Audit the complete re-uploaded marketing/account rules against current code; fix confirmed defects and run fresh isolated PHP/API regression tests. Current audit covers refund carries, source integrity, withdrawal approval and financial release gates; earlier pass counts are historical claims, not current verification.
- [x] Recheck restored original attachment: fixed zero-cap fallback, blocked base Member rank rewards, and made reward replays balance-independent with amount-conflict rejection. Fresh local PHP API suite passes 75/75 checks; no external deployment performed.
- [ ] Resolve matching event/funding policy: current sale+beneficiary key blocks later events for the same beneficiary; carry pairs currently charge the triggering sale rather than resolving earlier source-sale liability. Blocked on approved event identity and funding-source policy; do not guess or deploy.
- [ ] Complete refund reconciliation: invalidate refunded carry and audit source-pair dependencies, pool adjustments, reserve/cap treatment, and historical liabilities. Reserve/cap reinstatement and previously consumed source-pair corrections require Finance approval; current tests prove wallet reversal only, not full reconciliation.
- [x] Restore matching decisions and root placement: fresh-database API suite passes 54/54; local authenticated member page shows matching 150 BDT and remaining balance 270 BDT after later activations and withdrawal. Browser requests forwarded to the real local PHP API; external host remains unverified.
- [x] Earlier audit added source-volume records (lo_volumes + lo_volume_pairs), separate RANK pool spending, allocation records and wallet-refund tests (70/70 at that stage). Original attachment is now restored; this does not establish full refund/source-liability reconciliation. Historical-income reversal solely due to later inactivity remains subject to policy approval.
- [ ] Production financial release: blocked until historical reconciliation and Finance/Admin approval; do not deploy financial changes automatically.
- [x] Configure the supplied XAMPP tunnel URL and add missing-database automatic setup; setup and secure path tests pass.
- [x] Send the approved XAMPP setup update through the signed Master API; all five remote files read back identically, with deployment backups preserved.
- [x] Verify remote database initialization: signed migration and table reads return HTTP 500 with only “Server error”; requires the XAMPP Apache/PHP error log to diagnose.
- [x] Preserve the desktop member-panel layout with proportional screen fitting; all 11 pages passed at 320/393/768/1024/1280px without page overflow, with one-row navigation and mobile profile navigation/input verified in demo mode. Live-account checks remain blocked by the external PHP host.
- [x] Finish mobile dashboard full-width layout and profile label/colon alignment; all 11 member pages verified in demo mode at 320/390/768px, desktop columns preserved. Live-account checks still require the external PHP host.
- [x] Resolve conflicting rank thresholds: user approved first list (Gold/Executive at 1,000; Global Ambassador at 1,500,000); generation 1 is direct sponsor.
- [ ] (neelnod PDF redesign: dashboard, menu, tree, profile, reports, forms done; register, login done; phone-size check pending) Build the member panel to match the supplied dashboard kit (kit received through the new share link). [done: dashboard, tree, sponsors, statistics, activation, withdrawals, withdrawals-report, commission, profile, change-password, notice; Transaction + Mobile Recharge built and verified end-to-end locally (116 PHP checks + browser flow); Stockiest intentionally skipped]
- [x] Fresh authenticated reference recheck and shared presentation corrections: restored reference blue background, flat blue reports, compact table-row registration and standalone glass login; verified login, referral form and all 17 member views with a real local account at 1000px canvas width, no runtime errors, 3 frontend tests pass. Life OS branding and existing security/referral/financial rules retained; no deployment. Exact pixel parity is not established: login keeps ROOT/password visibility rather than a nonfunctional reference captcha, dashboard uses Life OS plan rows, and activation has no confirmed equivalent reference capture.

- [x] Verify statistics/sponsors/activation pages against the kit screenshots in the live preview (demo mode).
- [ ] Connect member login, profile, wallets, reports and trees to the PHP API; verify signed-out access boundaries and authenticated flows.
- [ ] Review old project mechanisms (blocked until an accessible Google Drive connection is available).
- [x] Prepare backendserver PHP REST API and migration-compatible MySQL schema.
- [x] Add audited, restricted deployment and database management with signed updates and rollback.
- [x] Test financial rules, login, access boundaries and server deployment (50/50 checks pass; live-server checks still need host access).

# Clone website
- [x] Copy original pages, styling and photos.
- [x] Add transparent Life OS logo at the top-right of news/event photos and their image viewer.
- [x] Verify pages, image loading, navigation and narrow-screen layout.
- [ ] Add a brand-matched background to Benefits of Life OS.
- [ ] Restore homepage news photos and a visible View more link; verify photo viewing and navigation.

# About and business presentation
- [ ] Add two illustrative senior-management profiles and matching portraits.
- [ ] Replace three expert images and two business-collaboration images.
- [x] Repair corrupted business-opportunity text; keep website content in English.
- [ ] Improve all About subsection layouts across device sizes without changing the theme.
- [ ] Verify updated pages and existing outstanding photo/background tasks.

# Services, galleries and support
- [ ] Refine all service submenu layouts for phones, tablets and desktops.
- [ ] Improve photo/video galleries and add an audio gallery with generated Life OS BD narration.
- [ ] Refine FAQ, Contact Us and Join Us presentation and English content.
- [ ] Generate suitable branded Contact Us and Join Us photographs.
- [ ] Verify requested pages, media controls and responsive layouts.

# Whole-site quality check
- [ ] Apply reference-style global mobile gutters, header/login/search and footer; contain and test every sidebar submenu.
- [ ] Verify GitHub includes all required files and real media while excluding private/generated files.
- [ ] Match supplied mobile reference positioning with a compact header, usable side menu and single-column gallery.
- [ ] Polish both Contact submenu pages (Contact Us and Business Center) within the existing theme.
- [ ] Test every public page across mobile, tablet and desktop widths; repair observed layout and interaction bugs.
- [ ] Verify image viewers, audio playback, video controls, menus, FAQs and enquiry forms.
- [ ] Run regression tests and record remaining external limitations.
## Referral join + ROOT
- [x] Reverify same-side chain placement for Left/Right links, displayed placement IDs, and downline-owned links: fresh isolated PHP suite 75/75, team suite 42/42, link unit tests 2/2; browser registered Left/Right members and confirmed saved placement plus authenticated dashboards. External server not updated; no financial deployment performed.
- [x] Add Left/Right copy links, selected-subtree automatic placement, and reference joining fields; verify against local PHP accounts. (75/75 backend tests, 23/23 team tests; browser: registration via Left and Right links, clipboard copy of both links, auto-placement into first free slot of the chosen subtree, desktop + mobile verified)
- [x] Join page via referral link (auto sponsor + auto placement)
- [x] ROOT button on login page, referral link copy on dashboard
- [ ] Deploy to live server — blocked: live server returns 502 (down)

# Admin panel (/admin)
- [x] Build all 17 admin pages matching the reference kit: login, dashboard (company info), site config, plan & ranks, notices, scroll news, password change, member list, member report, joining report, package activation, balance add, bonus report (ledger), withdrawals, matching events, rank reward, statement close, sales report, rank achievers.
- [x] Verify every page renders with demo data in the browser; exercise withdrawal approve, activation confirm (SUCCESS), rank reward payment, balance add and statement close flows end-to-end in demo mode.
- [x] Dedicated admin banner image (Life OS — Admin Panel) in the admin shell header.
- [ ] Verify admin login and all pages against the live PHP API (deserver.neexthub.site) — blocked: external host returns 502.

## Admin panel — reference recheck (done)
- [x] All 19 admin pages re-screenshotted and compared against the 19 reference screenshots
- [x] Login page restyled to the reference look (green pattern bg, white ADMIN LOGIN box, captcha digit box, Login/Cancel)
- [x] Date columns no longer truncated — compact YYYY-MM-DD HH:mm format (fmtDateShort) in Member List / Member Report
- [x] Reference-style copyright footer bar added to AdminShell (replaced marquee)
- [x] Verified in browser: build OK, no console errors
- [ ] Confirm rank name "Gold/Executive" (1000 matchings) — the plan document labels it this way; rename if it is a typo
- [ ] Live PHP API verification — blocked: deserver.neexthub.site returns 502
