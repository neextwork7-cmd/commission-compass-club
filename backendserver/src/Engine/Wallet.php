<?php
declare(strict_types=1);
namespace LifeOS\Engine;

use LifeOS\DB;

/** Shared wallet calculation: cashback and legacy balances never fund withdrawals. */
final class Wallet
{
    public static function lock(): void
    {
        DB::one('SELECT id FROM lo_financial_lock WHERE id = 1 FOR UPDATE');
    }

    public static function available(int $userId, ?int $excludingWithdrawal = null): float
    {
        $earned = (float) DB::val("SELECT COALESCE(SUM(amount),0) FROM lo_ledger WHERE user_id = ? AND ledger_type IN ('REFERRAL','MATCHING','GENERATION','RANK','ADJUSTMENT','WITHDRAW') AND status = 'PAID'", [$userId]);
        $sql = "SELECT COALESCE(SUM(amount),0) FROM lo_withdrawals WHERE user_id = ? AND status IN ('PENDING','APPROVED')";
        $params = [$userId];
        if ($excludingWithdrawal !== null) { $sql .= ' AND id <> ?'; $params[] = $excludingWithdrawal; }
        // Pending and paid recharges hold the same balance a withdrawal would.
        $recharge = (float) DB::val("SELECT COALESCE(SUM(amount),0) FROM lo_recharges WHERE user_id = ? AND status IN ('PENDING','PAID')", [$userId]);
        return round($earned - (float) DB::val($sql, $params) - $recharge, 6);
    }

    /** Deposit wallet: admin deposits minus Active New ID payments. Only this wallet can activate IDs. */
    public static function deposit(int $userId): float
    {
        return round((float) DB::val('SELECT COALESCE(SUM(amount),0) FROM lo_deposits WHERE user_id = ?', [$userId]), 6);
    }

    /** Transferable service credit: paid cashback minus what this member has sent out plus what they received. */
    public static function service(int $userId): float
    {
        $cashback = (float) DB::val("SELECT COALESCE(SUM(amount),0) FROM lo_ledger WHERE user_id = ? AND ledger_type = 'CASHBACK' AND status = 'PAID'", [$userId]);
        $out = (float) DB::val('SELECT COALESCE(SUM(amount),0) FROM lo_transfers WHERE from_user_id = ?', [$userId]);
        $in = (float) DB::val('SELECT COALESCE(SUM(amount),0) FROM lo_transfers WHERE to_user_id = ?', [$userId]);
        return round($cashback - $out + $in, 6);
    }
}
