import { useCallback, useEffect, useState } from 'react';
import { marketData } from '@/services/marketData';

export function useMarketData(underlying) {
  const [chain, setChain] = useState(null);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);
  const refreshChain = useCallback(async (signal) => {
    if (!underlying) return;
    try { setChain(await marketData.optionChain(underlying, signal)); setStatus('connected'); setError(null); }
    catch (err) { if (err.name !== 'AbortError') { setStatus('offline'); setError(err); } }
  }, [underlying]);
  useEffect(() => { const controller = new AbortController(); marketData.health(controller.signal).then(() => refreshChain(controller.signal)).catch((err) => { if (err.name !== 'AbortError') { setStatus('offline'); setError(err); } }); return () => controller.abort(); }, [refreshChain]);
  useEffect(() => { if (status !== 'connected') return; const id = setInterval(() => refreshChain(), 1500); return () => clearInterval(id); }, [refreshChain, status]);
  return { chain, status, error, refreshChain };
}
