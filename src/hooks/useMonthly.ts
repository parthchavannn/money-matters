import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AccountRow,
  BalanceRow,
  CheckinRow,
  MonthSummary,
  buildSummaries,
} from "@/lib/monthly";

export function useMonthly() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [accRes, balRes, chkRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, type, notes, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("account_balances")
        .select("id, account_id, month, balance")
        .eq("user_id", user.id)
        .order("month", { ascending: true }),
      supabase
        .from("monthly_checkins")
        .select("id, month, income, note")
        .eq("user_id", user.id)
        .order("month", { ascending: true }),
    ]);

    const acc = (accRes.data || []) as AccountRow[];
    const bal = ((balRes.data || []) as any[]).map((b) => ({
      ...b,
      balance: Number(b.balance),
    })) as BalanceRow[];
    const chk = ((chkRes.data || []) as any[]).map((c) => ({
      ...c,
      income: Number(c.income),
    })) as CheckinRow[];

    setAccounts(acc);
    setBalances(bal);
    setCheckins(chk);
    setSummaries(buildSummaries(bal, chk));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, accounts, balances, checkins, summaries, loading, refresh };
}
