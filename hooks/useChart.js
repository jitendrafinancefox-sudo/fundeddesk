import { useEffect, useRef, useState } from 'react';
import { createChartEngine } from '@/components/chart/ChartEngine';
import { setCandles } from '@/components/chart/CandleSeries';
import { setChartRuntime } from '@/stores/chartStore';

export function useChart({ candles, height = 440, onReady } = {}) {
  const containerRef = useRef(null);
  const runtimeRef = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!containerRef.current) return;
    const runtime = createChartEngine(containerRef.current, { height });
    runtimeRef.current = runtime;
    const resize = () => runtime.chart.applyOptions({ width: containerRef.current?.clientWidth || 1, height: containerRef.current?.clientHeight || height });
    const observer = new ResizeObserver(resize); observer.observe(containerRef.current); resize();
    setChartRuntime({ instance: runtime.chart, series: runtime.series, status: 'ready' }); setReady(true); onReady?.(runtime);
    return () => { observer.disconnect(); runtime.destroy(); runtimeRef.current = null; setChartRuntime({ instance: null, series: null, status: 'idle' }); };
  }, [height, onReady]);
  useEffect(() => { if (runtimeRef.current && candles?.length) { setCandles(runtimeRef.current.series, candles); runtimeRef.current.chart.timeScale().fitContent(); } }, [candles]);
  return { containerRef, runtime: runtimeRef, ready };
}
