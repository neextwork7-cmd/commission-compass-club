"""Build the refined Life OS database from the old site's dump.

Reads the old site database (LEGACY_DB, loaded from the phpMyAdmin dump) and writes into a freshly
migrated Life OS database (TARGET_DB) on the same local MariaDB server. Rules (user decisions):
  * every wallet/point/loan balance starts at 0;
  * members keep login, sponsor, binary placement, package-active state and rank;
  * old activations are recorded as already settled, so no new-plan commission is ever paid for them;
  * profile photos, NID and selfie images are not imported;
  * old transaction/activation/withdraw history is kept as read-only archive tables.
"""
import os
from collections import defaultdict

import pymysql

LEGACY = os.environ.get("LEGACY_DB", "old_lifeos")
TARGET = os.environ.get("TARGET_DB", "lifeos")
SOCK = os.environ.get("MYSQL_SOCKET", "/tmp/mdb/run/m.sock")
IMPORT_AT = os.environ.get("IMPORT_AT", "2026-11-09 00:00:00")

# Old ranks (by required matched pairs) → new plan rank ids with the same threshold.
# Old Bronze (50 pairs) has no equivalent in the new plan, so it maps to Member only.
RANK_MAP = {3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9}
MEMBER_TABLES = ["lo_volume_pairs", "lo_volumes", "lo_matching_decisions", "lo_matching_events", "lo_matching_bills",
    "lo_daily_caps", "lo_statements", "lo_ledger", "lo_allocations", "lo_pool_movements", "lo_sales", "lo_activations",
    "lo_enroll_legs", "lo_user_ranks", "lo_withdrawals", "lo_transfers", "lo_recharges", "lo_deposits", "lo_tree",
    "user_profiles", "user_wallets", "users", "wallet_transactions", "activation_requests", "withdraw_requests",
    "point_activated_ids", "activation_point_transactions", "ranks"]
ARCHIVE_TABLES = ["wallet_transactions", "activation_requests", "withdraw_requests", "point_activated_ids",
    "activation_point_transactions", "ranks"]
IMAGE_COLUMNS = {"photo_base64", "nid_front_base64", "nid_back_base64", "selfie_base64", "comp_signature"}


def connect():
    return pymysql.connect(unix_socket=SOCK, user="root", database=TARGET, charset="utf8mb4", autocommit=False)


def columns(cur, db, table):
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema=%s AND table_name=%s ORDER BY ordinal_position", (db, table))
    return [r[0] for r in cur.fetchall()]


def build_tree(rows):
    """Returns {id: (parent, side)} with at most one child per side; conflicting extras are re-placed
    at the bottom of the same side's outer leg so every member stays inside the original subtree."""
    by_id = {r[0]: r for r in rows}
    child = {}
    placed = {}
    extras = []
    root = None
    for uid, parent, side, _ in sorted(rows):
        if parent is None:
            if root is None:
                root = uid
                placed[uid] = (None, None)
            else:
                extras.append((uid, root, "L"))
            continue
        s = "L" if side == "left" else "R"
        if parent not in by_id:
            extras.append((uid, root, s))
        elif (parent, s) in child:
            extras.append((uid, parent, s))
        else:
            child[(parent, s)] = uid
            placed[uid] = (parent, s)
    moved = []
    for uid, parent, s in extras:
        if (parent, s) not in child:
            child[(parent, s)] = uid
            placed[uid] = (parent, s)
            moved.append((uid, parent, parent, s))
            continue
        # Nearest free slot (level order, left first) inside the same-side subtree of the original parent.
        queue, head, spot = [child[(parent, s)]], 0, None
        while spot is None:
            n = queue[head]; head += 1
            for side in ("L", "R"):
                if (n, side) not in child:
                    spot = (n, side)
                    break
                queue.append(child[(n, side)])
        child[spot] = uid
        placed[uid] = spot
        moved.append((uid, parent, spot[0], spot[1]))
    # Every member must be reachable from ROOT (no cycles / orphans).
    kids = defaultdict(list)
    for (p, s), c in child.items():
        kids[p].append(c)
    seen, stack = set(), [root]
    while stack:
        n = stack.pop()
        if n in seen:
            continue
        seen.add(n)
        stack.extend(kids[n])
    unreachable = [uid for uid in by_id if uid not in seen]
    for uid in sorted(unreachable):
        # Detach from the cycle and hang under ROOT's outer left leg.
        p, s = placed[uid]
        if (p, s) in child and child[(p, s)] == uid:
            del child[(p, s)]
        cur = root
        while (cur, "L") in child:
            cur = child[(cur, "L")]
        child[(cur, "L")] = uid
        placed[uid] = (cur, "L")
        moved.append((uid, p, cur, "L"))
    return root, placed, child, moved


def main():
    db = connect()
    cur = db.cursor()
    cur.execute("SET FOREIGN_KEY_CHECKS=0")
    for t in MEMBER_TABLES:
        cur.execute(f"TRUNCATE TABLE `{t}`")  # also resets ids so the import file starts clean
    cur.execute("UPDATE lo_pools SET balance=0")
    cur.execute("DELETE FROM lo_settings WHERE k IN ('test_clock_date','test_lab_days','test_lab_last','test_lab_progress','test_lab_job','cron_last_run')")

    # Members: logins, sponsor codes, rank and status kept; every point/loan balance zero.
    ucols = [c for c in columns(cur, TARGET, "users") if c != "username"]
    zero = {"points": "0", "activation_points": "0", "loan_recovery_active": "0", "loan_amount": "0", "loan_paid": "0"}
    sel = ", ".join(zero.get(c, f"`{c}`") for c in ucols)
    cur.execute(f"INSERT INTO users ({', '.join('`'+c+'`' for c in ucols)}) SELECT {sel} FROM `{LEGACY}`.users ORDER BY id")
    users = cur.rowcount

    # One profile per member (latest edited row), images excluded.
    pcols = [c for c in columns(cur, LEGACY, "user_profiles") if c != "id"]
    psel = ", ".join("NULL" if c in IMAGE_COLUMNS else f"p.`{c}`" for c in pcols)
    cur.execute(f"""INSERT INTO user_profiles ({', '.join('`'+c+'`' for c in pcols)})
        SELECT {psel} FROM `{LEGACY}`.user_profiles p
        JOIN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, id DESC) rn
              FROM `{LEGACY}`.user_profiles) x WHERE rn = 1) k ON k.id = p.id
        JOIN users u ON u.id = p.user_id ORDER BY p.user_id""")
    cur.execute("INSERT INTO user_profiles (user_id, name, created_at) SELECT u.id, NULL, u.created_at FROM users u WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id=u.id)")
    cur.execute("INSERT INTO user_wallets (user_id, updated_at) SELECT id, created_at FROM users ORDER BY id")

    # Archive history tables with identical structure.
    for t in ARCHIVE_TABLES:
        cols = columns(cur, TARGET, t)
        cl = ", ".join(f"`{c}`" for c in cols)
        cur.execute(f"INSERT INTO `{t}` ({cl}) SELECT {cl} FROM `{LEGACY}`.`{t}` ORDER BY id")

    # Sponsor (enrollment) and binary placement tree.
    cur.execute(f"SELECT id, placement_id, position, referred_by FROM `{LEGACY}`.users")
    rows = cur.fetchall()
    root, placed, child, moved = build_tree(rows)
    cur.execute("SELECT life_id, id FROM users")
    by_life = dict(cur.fetchall())
    cur.execute("SELECT id, status FROM users")
    status = dict(cur.fetchall())
    tree = []
    for uid, _, _, ref in rows:
        parent, side = placed[uid]
        sponsor = None if uid == root else by_life.get(ref) if ref else None
        if uid != root and sponsor is None:
            sponsor = root
        tree.append((uid, sponsor, parent, side, child.get((uid, "L")), child.get((uid, "R")), 1 if status[uid] == "active" else 0))
    cur.executemany("INSERT INTO lo_tree (user_id, sponsor_id, placement_parent_id, placement_side, left_child_id, right_child_id, is_active) VALUES (%s,%s,%s,%s,%s,%s,%s)", tree)
    for uid, _, new_parent, s in moved:
        cur.execute("UPDATE users SET placement_id=%s, position=%s WHERE id=%s", (new_parent, "left" if s == "L" else "right", uid))

    # Package-active members: one SUCCESS activation each, already settled (processed=1, no sale/commission).
    cur.execute(f"""INSERT INTO lo_activations (activation_code, user_id, payment_ref, payment_status, fee, bv, processed, created_at, processed_at)
        SELECT CONCAT('LEGACY-', u.life_id), u.id, CONCAT('LEGACY-PAY-', u.id), 'SUCCESS', 1000, 1000, 1,
               COALESCE(a.at, p.at, u.created_at), %s
        FROM users u
        LEFT JOIN (SELECT user_id, MIN(created_at) at FROM `{LEGACY}`.activation_requests WHERE status='approved' GROUP BY user_id) a ON a.user_id=u.id
        LEFT JOIN (SELECT target_user_id, MIN(created_at) at FROM `{LEGACY}`.point_activated_ids GROUP BY target_user_id) p ON p.target_user_id=u.id
        WHERE u.status='active' ORDER BY u.id""", (IMPORT_AT,))
    activations = cur.rowcount

    # Ranks kept: new-plan rank with the same threshold (plus lower ranks, like Rank::check).
    ranks = 0
    cur.execute(f"""SELECT u.id, u.rank_id, (SELECT MAX(r.created_at) FROM `{LEGACY}`.user_rank_rewards r WHERE r.user_id=u.id) FROM users u WHERE u.rank_id >= 2""")
    for uid, old, at in cur.fetchall():
        top = RANK_MAP.get(old, 1)
        for rid in range(1, top + 1):
            cur.execute("INSERT IGNORE INTO lo_user_ranks (user_id, rank_id, achieved_at) VALUES (%s,%s,%s)", (uid, rid, at or IMPORT_AT))
            ranks += 1
    db.commit()
    print(f"users={users} activations={activations} rank_rows={ranks} root={root} re_placed={len(moved)}")
    for m in moved:
        print("re-placed", m)


if __name__ == "__main__":
    main()
