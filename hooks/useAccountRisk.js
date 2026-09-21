'use client';

// Small adapter around the canonical risk engine (lib/riskEngine.js) for
// components outside /portal/accounts/[id] that still need a real risk
// read-out for an account. Mirrors that page's fetch pattern exactly —
// trades + soft_breaches, cleared before each refetch so account A's data
// can never flash under account B — but does not duplicate any of the
// evaluator's logic; evaluateAccountRisk stays the single source of truth.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { evaluateAccountRisk } from '@/lib/riskEngine';

export function useAccountRisk(account) {
  const plan = account?.plans || null;
  const [trades, setTrades] = useState([]);
  const [softBreaches, setSoftBreaches] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTrades([]);
    setSoftBreaches({});
    setError(null);
    if (!account?.id) { setLoading(false); return undefined; }

    setLoading(true);
    let on = true;
    (async () => {
      try {
        const [{ data: tr }, { data: br }] = await Promise.all([
          supabase.from('trades').select('*').eq('account_id', account.id).order('traded_at', { ascending: true }),
          supabase.from('soft_breaches').select('rule_type, breach_count, last_breach_at').eq('account_id', account.id),
        ]);
        if (!on) return;
        setTrades(tr || []);
        const map = {};
        (br || []).forEach((row) => { map[row.rule_type] = { count: row.breach_count, lastBreachAt: row.last_breach_at }; });
        setSoftBreaches(map);
      } catch (e) {
        if (on) setError(e?.message || 'Failed to load account risk data.');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [account?.id]);

  const risk = useMemo(
    () => (account && plan ? evaluateAccountRisk(account, plan, { trades, softBreaches }) : null),
    [account, plan, trades, softBreaches],
  );

  return { risk, loading, error };
}
