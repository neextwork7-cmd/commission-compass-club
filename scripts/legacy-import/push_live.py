"""Replace the live server's member data with the refined local database, through the signed Master API.

Resumable: progress is stored in STATE (rows sent per table). Statements stay below the live server's
1 MB max_allowed_packet. INSERT IGNORE makes a retried chunk harmless.
Usage: python push_live.py wipe | load [seconds] | verify
"""
import importlib.util
import json
import os
import sys
import time
from pathlib import Path

import pymysql
from pymysql.converters import escape_item

SOCK = os.environ.get("MYSQL_SOCKET", "/tmp/mdb/run/m.sock")
SOURCE = os.environ.get("TARGET_DB", "lifeos")
STATE = Path(os.environ.get("PUSH_STATE", "/tmp/import-work/push-state.json"))
CHUNK = 700_000
WIPE = ["lo_volume_pairs", "lo_volumes", "lo_matching_decisions", "lo_matching_events", "lo_matching_bills", "lo_daily_caps",
    "lo_statements", "lo_ledger", "lo_allocations", "lo_pool_movements", "lo_sales", "lo_activations", "lo_enroll_legs",
    "lo_user_ranks", "lo_withdrawals", "lo_transfers", "lo_recharges", "lo_deposits", "lo_tree", "user_profiles", "user_wallets",
    "users", "wallet_transactions", "activation_requests", "withdraw_requests", "point_activated_ids",
    "activation_point_transactions", "ranks"]
LOAD = [("users", "id"), ("user_profiles", "id"), ("user_wallets", "id"), ("lo_tree", "user_id"), ("lo_activations", "id"),
    ("lo_user_ranks", "user_id, rank_id"), ("ranks", "id"), ("activation_requests", "id"), ("withdraw_requests", "id"),
    ("point_activated_ids", "id"), ("activation_point_transactions", "id"), ("wallet_transactions", "id")]

spec = importlib.util.spec_from_file_location("mu", Path(__file__).resolve().parents[1] / "master-update.py")
mu = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mu)


def live(sql, write=False, tries=4):
    body = {"sql": sql, "params": []}
    if write:
        body["confirm_write"] = True
    for attempt in range(tries):
        try:
            return mu.request("POST", "/api/master/db/query", body)
        except Exception as error:  # transient host/proxy failures: retry the same idempotent statement
            if attempt == tries - 1:
                raise
            print("retry after:", str(error)[:120])
            time.sleep(5 * (attempt + 1))


def state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}


def save(s):
    STATE.write_text(json.dumps(s))


def wipe():
    live("UPDATE lo_settings SET v='0' WHERE k IN ('login_status','signup_status')", True)
    for t in WIPE:
        live(f"TRUNCATE TABLE `{t}`", True)
    live("UPDATE lo_pools SET balance=0", True)
    live("DELETE FROM lo_settings WHERE k IN ('test_clock_date','test_lab_days','test_lab_last','test_lab_progress','test_lab_job','cron_last_run')", True)
    save({})
    print("live member data wiped; login/signup paused")


def load(budget):
    start = time.time()
    s = state()
    db = pymysql.connect(unix_socket=SOCK, user="root", database=SOURCE, charset="utf8mb4")
    cur = db.cursor()
    # The live API session runs at +06:00; read TIMESTAMP values in the same zone so instants are preserved.
    cur.execute("SET time_zone = '+06:00'")
    for table, order in LOAD:
        done = s.get(table, 0)
        cur.execute(f"SELECT COUNT(*) FROM `{table}`")
        total = cur.fetchone()[0]
        if done >= total:
            continue
        cur.execute(f"SHOW COLUMNS FROM `{table}`")
        cols = [r[0] for r in cur.fetchall()]
        head = f"INSERT IGNORE INTO `{table}` ({', '.join('`'+c+'`' for c in cols)}) VALUES "
        cur.execute(f"SELECT * FROM `{table}` ORDER BY {order} LIMIT {total} OFFSET {done}")
        values, size, pending = [], len(head), 0
        for row in cur.fetchall():
            v = "(" + ",".join(escape_item(x, "utf8mb4") for x in row) + ")"
            if values and size + len(v) + 1 > CHUNK:
                live(head + ",".join(values), True)
                done += pending
                s[table] = done
                save(s)
                values, size, pending = [], len(head), 0
                if time.time() - start > budget:
                    print(f"paused at {table} {done}/{total}")
                    return False
            values.append(v); size += len(v) + 1; pending += 1
        if values:
            live(head + ",".join(values), True)
            done += pending
            s[table] = done
            save(s)
        print(f"{table}: {done}/{total}")
    print("load complete")
    return True


def verify():
    db = pymysql.connect(unix_socket=SOCK, user="root", database=SOURCE, charset="utf8mb4")
    cur = db.cursor()
    ok = True
    for table, _ in LOAD:
        cur.execute(f"SELECT COUNT(*) FROM `{table}`")
        local = cur.fetchone()[0]
        remote = int(live(f"SELECT COUNT(*) AS n FROM `{table}`")["rows"][0]["n"])
        ok &= local == remote
        print(f"{'OK ' if local == remote else 'BAD'} {table}: local={local} live={remote}")
    return ok


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "wipe":
        wipe()
    elif cmd == "load":
        load(float(sys.argv[2]) if len(sys.argv) > 2 else 480)
    elif cmd == "verify":
        sys.exit(0 if verify() else 1)
