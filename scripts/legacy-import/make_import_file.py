"""Finalize the refined database and write the phpMyAdmin import file.

1. Applies site settings (JSON file from the live server, Test Lab keys removed) and admin accounts.
2. Dumps the whole Life OS database (structure + data + applied-migration records) with options that
   import on shared-hosting MariaDB 10.x / MySQL 5.7+ through phpMyAdmin (no LOCK TABLES, no
   MariaDB 11 sandbox line, no DEFINERs), then gzips it.
Usage: python make_import_file.py settings.json admins.json out.sql.gz
"""
import gzip
import json
import os
import re
import subprocess
import sys

import pymysql

SOCK = os.environ.get("MYSQL_SOCKET", "/tmp/mdb/run/m.sock")
TARGET = os.environ.get("TARGET_DB", "lifeos")
DUMP = os.environ.get("MARIADB_DUMP", "mariadb-dump")
SKIP_SETTINGS = {"test_clock_date", "test_lab_days", "test_lab_last", "test_lab_progress", "test_lab_job", "cron_last_run"}


def finalize(settings, admins):
    db = pymysql.connect(unix_socket=SOCK, user="root", database=TARGET, charset="utf8mb4")
    cur = db.cursor()
    cur.execute("DELETE FROM lo_settings")
    for row in settings:
        if row["k"] not in SKIP_SETTINGS:
            cur.execute("INSERT INTO lo_settings (k, v) VALUES (%s, %s)", (row["k"], row["v"]))
    cur.execute("DELETE FROM admin_users")
    for a in admins:
        cur.execute("INSERT INTO admin_users (id, name, email, password, role_id, last_active, two_fa_enabled) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (a["id"], a["name"], a["email"], a["password"], a["role_id"], a.get("last_active"), a.get("two_fa_enabled", 0)))
    db.commit()


def dump(out):
    cmd = [DUMP, "-uroot", f"--socket={SOCK}", "--single-transaction", "--skip-lock-tables", "--skip-add-locks",
           "--no-tablespaces", "--skip-triggers", "--default-character-set=utf8mb4", "--net-buffer-length=500000",
           "--hex-blob", "--add-drop-table", TARGET]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    with gzip.open(out, "wb", compresslevel=6) as gz:
        gz.write(b"-- Life OS complete database (old site members refined for the new plan).\n"
                 b"-- Import into an EMPTY database with phpMyAdmin > Import. Existing tables with the same name are replaced.\n")
        for line in proc.stdout:
            if line.startswith(b"/*M!999999"):
                continue  # MariaDB 11 sandbox marker breaks older servers
            line = re.sub(rb"DEFINER=`[^`]+`@`[^`]+`", b"", line)
            line = line.replace(b"utf8mb4_uca1400_ai_ci", b"utf8mb4_unicode_ci")
            gz.write(line)
    if proc.wait() != 0:
        raise SystemExit("dump failed")


if __name__ == "__main__":
    settings = json.load(open(sys.argv[1]))
    admins = json.load(open(sys.argv[2]))
    finalize(settings, admins)
    dump(sys.argv[3])
    print("written", sys.argv[3], os.path.getsize(sys.argv[3]))
