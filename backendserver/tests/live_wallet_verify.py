"""Read-only live QA reconciliation. Provide LIFEOS_QA_STATE_FILE from the browser run."""
import importlib.util
import json
import os
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("master_update", ROOT / "scripts/master-update.py")
master = importlib.util.module_from_spec(spec)
spec.loader.exec_module(master)


class LiveWalletRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.environ["LIFEOS_QA_STATE_FILE"]) as file:
            state = json.load(file)
        cls.payer, cls.recipient = [u["user_id"] for u in state["users"]]

    def rows(self, sql, params):
        return master.request("POST", "/api/master/db/query", {"sql": sql, "params": params})["rows"]

    def test_fixed_package_amount_1000(self):
        rows = self.rows("SELECT fee, payment_status FROM lo_activations WHERE user_id=?", [self.recipient])
        self.assertEqual(len(rows), 1)
        self.assertEqual(float(rows[0]["fee"]), 1000)
        self.assertEqual(rows[0]["payment_status"], "SUCCESS")

    def test_deposit_only_debit_1000(self):
        rows = self.rows("SELECT amount FROM lo_deposits WHERE user_id=? AND target_user_id=? AND kind='ACTIVATE_ID'", [self.payer, self.recipient])
        self.assertEqual(len(rows), 1)
        self.assertEqual(float(rows[0]["amount"]), -1000)
        balance = self.rows("SELECT SUM(amount) AS balance FROM lo_deposits WHERE user_id=?", [self.payer])
        self.assertEqual(float(balance[0]["balance"]), 0)

    def test_other_wallets_not_debited(self):
        rows = self.rows("SELECT COUNT(*) AS n FROM lo_ledger WHERE user_id=? AND amount<0", [self.payer])
        self.assertEqual(int(rows[0]["n"]), 0)
        rows = self.rows("SELECT COUNT(*) AS n FROM lo_transfers WHERE from_user_id=?", [self.payer])
        self.assertEqual(int(rows[0]["n"]), 0)

    def test_history_links_payer_recipient_activation(self):
        rows = self.rows("SELECT d.activation_id FROM lo_deposits d JOIN lo_activations a ON a.id=d.activation_id WHERE d.user_id=? AND d.target_user_id=? AND a.user_id=?", [self.payer, self.recipient, self.recipient])
        self.assertEqual(len(rows), 1)
        self.assertGreater(int(rows[0]["activation_id"]), 0)

    def test_activation_does_not_pay_immediate_commission(self):
        rows = self.rows("SELECT processed FROM lo_activations WHERE user_id=?", [self.recipient])
        self.assertEqual(int(rows[0]["processed"]), 0)
        rows = self.rows("SELECT COUNT(*) AS n FROM lo_ledger l JOIN lo_activations a ON a.id=l.activation_id WHERE a.user_id=?", [self.recipient])
        self.assertEqual(int(rows[0]["n"]), 0)


if __name__ == "__main__":
    unittest.main()