/**
 * lib/execution/index.js — Phase 8
 *
 * Single place a future caller asks "which execution provider is active."
 * Today this can only ever return the paper provider — there is no
 * configuration flag, env var, or account field anywhere that turns on
 * broker execution, because broker execution does not exist.
 *
 * HONESTY NOTE (Phase 18/20 audit finding): this file's own abstraction is
 * NOT currently load-bearing. The live terminal's actual call sites
 * (components/chart-tv/TVTerminal.js, components/terminal/PositionManager.js,
 * OrderManager.js, TradeHistory.js, AccountManager.js) call
 * `stores/TradingStore.js` directly — none of them go through
 * `getExecutionProvider()`/`PaperExecutionProvider`. Swapping in real broker
 * execution later is therefore NOT a one-function change: it would require
 * rerouting every one of those direct TradingStore call sites through this
 * provider abstraction first. Rerouting that surface was judged out of
 * scope for a documentation-only correction (Phase 20) — it's real,
 * already-regression-tested UI code, not a drop-in swap. When broker
 * execution is actually built, budget for that rerouting as real work.
 */
import { PaperExecutionProvider } from './PaperExecutionProvider';
import { BrokerExecutionProvider } from './BrokerExecutionProvider';

export { PaperExecutionProvider, BrokerExecutionProvider };
export * from './normalize';
export * from './ExecutionProvider';

export function getExecutionProvider() {
  return PaperExecutionProvider;
}
