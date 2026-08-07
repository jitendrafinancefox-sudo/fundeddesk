'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { supabase } from '@/lib/supabaseClient';
import { marketData } from '@/services/marketData';
import { PriceBus } from '@/stores/PriceBus';
import { INDEX_TOKEN } from './constants';

export default function TerminalDataLayer({ underlying, children }) {
  const { chain, status, error } = useMarketData(underlying);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [stockQuotes, setStockQuotes] = useState({});

  // Load watchlist
  useEffect(() => {
    const loadWatchlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from('user_watchlist_items')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setWatchlistItems(data);
    };
    loadWatchlist();
  }, []);

  // Poll stock prices every 15s
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    async function pollStockPrices() {
      try {
        const [niftyData, bankData] = await Promise.all([
          marketData.heatmap('NIFTY', controller.signal),
          marketData.heatmap('BANKNIFTY', controller.signal),
        ]);
        if (!mounted) return;
        const next = {};
        [...(niftyData || []), ...(bankData || [])].forEach((stock) => {
          if (stock.token) {
            next[stock.token] = {
              ltp: stock.ltp,
              bid: stock.bid,
              ask: stock.ask,
              change: stock.dayChangePercent,
              prevClose: stock.prevClose,
            };
          }
        });
        setStockQuotes(next);
      } catch (e) {
        if (e?.name !== 'AbortError') console.warn('Stock price poll failed', e);
      }
    }
    pollStockPrices();
    const id = setInterval(pollStockPrices, 15000);
    return () => { clearInterval(id); controller.abort(); };
  }, []);

  // Prices from chain
  const prices = useMemo(() => {
    if (!chain) return {};
    const next = { [INDEX_TOKEN[underlying]]: +chain.spot || 0 };
    (chain.rows || []).forEach((row) => {
      if (row.ceToken) next[row.ceToken] = +row.ce || 0;
      if (row.peToken) next[row.peToken] = +row.pe || 0;
    });
    return next;
  }, [chain, underlying]);

  // Stream live quotes into the PriceBus (scoped subscriptions — widgets are
  // only notified for the tokens they subscribed to).
  useEffect(() => {
    Object.entries(prices).forEach(([token, ltp]) => {
      if (ltp) PriceBus.set(token, { ltp: Number(ltp) });
    });
    Object.entries(stockQuotes).forEach(([token, q]) => {
      if (q && q.ltp) PriceBus.set(token, { ltp: q.ltp, bid: q.bid, ask: q.ask, change: q.change, prevClose: q.prevClose });
    });
  }, [prices, stockQuotes]);

  // Displayed items for watchlist
  const displayedItems = useMemo(() => {
    const items = [
      { token: INDEX_TOKEN.NIFTY, exchange: 'NSE', symbol_label: 'NIFTY 50', kind: 'index' },
      { token: INDEX_TOKEN.BANKNIFTY, exchange: 'NSE', symbol_label: 'BANKNIFTY', kind: 'index' },
    ];
    watchlistItems.forEach((w) => {
      if (w.token !== INDEX_TOKEN.NIFTY && w.token !== INDEX_TOKEN.BANKNIFTY) {
        items.push({ token: w.token, exchange: w.exch, symbol_label: w.symbol_label, kind: w.kind });
      }
    });
    return items;
  }, [watchlistItems]);

  const addWatchlistItem = useCallback(async (item, flash) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return flash('err', 'Login required');
    const { error: dbErr } = await supabase.from('user_watchlist_items').insert({
      user_id: session.user.id,
      token: item.token,
      exch: item.exchange,
      symbol_label: item.symbol_label,
      kind: item.kind,
    });
    if (dbErr) return flash('err', dbErr.message);
    setWatchlistItems((prev) => [...prev, {
      token: item.token,
      exch: item.exchange,
      symbol_label: item.symbol_label,
      kind: item.kind,
      created_at: new Date().toISOString(),
    }]);
    flash('ok', `${item.symbol_label} added to watchlist`);
  }, []);

  const removeWatchlistItem = useCallback(async (token, flash) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    const { error: dbErr } = await supabase.from('user_watchlist_items').delete()
      .eq('user_id', session.user.id)
      .eq('token', token);
    if (dbErr) return flash('err', dbErr.message);
    setWatchlistItems((prev) => prev.filter((w) => w.token !== token));
  }, []);

  return children({
    chain,
    status,
    error,
    prices,
    stockQuotes,
    displayedItems,
    addWatchlistItem,
    removeWatchlistItem,
  });
}
