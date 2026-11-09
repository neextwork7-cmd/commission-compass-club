"""Package already-built cPanel public files without credentials or production data."""
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
STAGE = Path('/tmp/lifeos-cpanel-package')
if STAGE.exists():
    shutil.rmtree(STAGE)
WEB = STAGE / 'public_html'
shutil.copytree(ROOT / 'dist/client', WEB, ignore=shutil.ignore_patterns('.lovable', '*.map', '_headers'))
BACKEND = WEB / 'backendserver'
BACKEND.mkdir()
for name in ['index.php', '.htaccess', 'config.example.php', 'README.md', 'src', 'bin', 'database']:
    source = ROOT / 'backendserver' / name
    if source.is_dir():
        shutil.copytree(source, BACKEND / name, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '.git', '.env'))
    else:
        shutil.copy2(source, BACKEND / name)
(BACKEND / 'storage').mkdir()
(BACKEND / 'storage/.htaccess').write_text('Require all denied\n')
(STAGE / 'INSTALL-BANGLA.txt').write_text('''Life OS — cPanel deployment (domain root)

১. আগে বর্তমান ওয়েবসাইট ও MySQL ডাটাবেসের backup নিন। ZIP-এর public_html-এর ভেতরের সব ফাইল আপনার domain-এর document root-এ দিন। .htaccess-ও দিতে হবে।
২. backendserver অবশ্যই domain root-এর মধ্যে থাকবে: https://আপনার-ডোমেইন/backendserver/api। domain বদলালে frontend API ঠিকানা নিজে বদলাবে; frontend .env লাগবে না।
৩. PHP 8.1+ এবং pdo_mysql চালু করুন; Apache/LiteSpeed-এ mod_rewrite ও .htaccess কাজ করতে হবে। PHP temporary directory ও backendserver/storage writable রাখুন। Node.js/Composer লাগবে না।
৪. নতুন hosting-এ cPanel MySQL Database Wizard দিয়ে database/user তৈরি করে ALL PRIVILEGES দিন। তারপর phpMyAdmin > সেই database > Import-এ আলাদাভাবে দেওয়া LifeOS-Full-Database.sql.gz ফাইলটি দিন (unzip করবেন না)। এতে পুরোনো সাইটের সব member, Admin ও সব টেবিল আছে। এই ZIP-এ নিজে কোনো database বা login নেই।
৫. backendserver/config.example.php কপি করে config.php করুন। db host/name/user/pass দিন। পুরোনো database ব্যবহার করলে আগের app_secret/master_key নিরাপদে একই রাখুন; নতুন install হলে আলাদা 64+ character random secret দিন। config.php/.env/runtime.php overwrite করবেন না।
৬. auto_setup=true রাখলে API-এর প্রথম database request-এ database/*.sql থেকে safe additive migration নিজে চলবে; আগের account মুছবে না। পুরোনো 001_legacy_schema.sql phpMyAdmin-এ সরাসরি import করবেন না—ওটিতে destructive legacy statements আছে। ZIP আপনার পূর্বের data নয়, software/schema বহন করে।
৭. /login খুলুন: captcha আসবে। পুরোনো member তাদের আগের Life ID/মোবাইল নম্বর ও আগের password দিয়ে ঢুকবেন; /admin/login-এ Admin দিয়ে ঢুকুন। database import না করলে Admin/ROOT নিজে তৈরি হবে না।
৮. Cron নিজে চালু হয় না। approval ও reconciliation-এর পরে commission_cron_enabled=true এবং Admin financial_release_approved=1 দিন। cPanel Cron Jobs-এ Once Per Minute:
* * * * * /usr/local/bin/php /home/CPANEL_USER/public_html/backendserver/bin/settle.php --execute --batch=100 >> /home/CPANEL_USER/lifeos-settlement.log 2>&1
আপনার PHP binary ও domain document-root path অনুযায়ী বদলান। আগে একই command --dry-run দিয়ে পরীক্ষা করুন। cron_base_url=https://আপনার-ডোমেইন/backendserver দিন যদি signed HTTP cron ব্যবহার করেন। backendserver/README.md দেখুন।
৯. installation-এর পরে /backendserver/config.php এবং /backendserver/database/008_deposit_wallet.sql 403 হতে হবে; /login ও /admin/login সরাসরি ও refresh-এ খুলতে হবে। HTTPS চালু করুন।

সীমা: local exported frontend/browser/address tests করা হয়েছে; আপনার cPanel-এর PHP/MySQL/configuration ও automatic commission execution hosting-এ install না করে নিশ্চিত করা যায় না।
''', encoding='utf-8')
print(STAGE)