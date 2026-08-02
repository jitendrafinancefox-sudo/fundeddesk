// Client-side Simulated Matching Engine.
// While the live market is closed / relay is offline, an order is matched
// instantly at the last visible price line on the chart, so Active Positions
// and the floating P&L banner react immediately with no broker connection.
export function simulateMatch({ symbol, type, lots, quantity, entryPrice, stopLoss = null, takeProfit = null, timestamp = new Date() }) {
  return {
    id: crypto.randomUUID(),
    symbol,
    type, // 'BUY' | 'SELL'
    lots,
    quantity, // absolute contracts = lots * multiplier
    entryPrice, // last visible close line on the chart
    stopLoss,
    takeProfit,
    timestamp,
    status: 'FILLED',
  };
}
