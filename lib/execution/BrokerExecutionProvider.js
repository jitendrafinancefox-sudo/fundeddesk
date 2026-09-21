/**
 * lib/execution/BrokerExecutionProvider.js — Phase 8
 *
 * PLACEHOLDER ONLY. There is no broker integration, no broker API, no
 * broker credentials, and no server-side order authority anywhere in this
 * application today. This file exists solely to document WHERE that
 * integration would live and what shape it must satisfy — it must never be
 * mistaken for a working provider.
 *
 * The correct future architecture (never implement the browser talking to
 * a broker directly):
 *
 *   Browser (this terminal)
 *     -> Authenticated FundedDesk server (does not exist yet)
 *       -> Broker adapter (does not exist yet)
 *         -> Broker API (Zerodha/Kite, Angel One, etc. — not integrated)
 *       <- Broker response
 *     <- Server-side order ledger write (Supabase `orders`/`trades` — not
 *        wired to this terminal; the real `trades` table used by
 *        lib/riskEngine.js is admin-maintained, not order-driven)
 *   <- Browser receives the confirmed, server-verified result
 *
 * Every method below is intentionally non-functional: `configured` is
 * always false, and every action rejects with a clear, honest reason
 * rather than a fabricated success. No broker order ID is ever generated
 * here. Do not "wire this up" with fake data to make a demo look complete
 * — that is explicitly forbidden for this phase.
 */

const NOT_CONFIGURED = 'Broker execution is not configured. This terminal only supports simulated (paper) trading today.';

function rejected() {
  return {
    status: 'rejected', orderId: null, brokerOrderId: null,
    filledQuantity: 0, averageFillPrice: null, rejectionReason: NOT_CONFIGURED,
  };
}

export const BrokerExecutionProvider = {
  id: 'broker',
  label: 'Broker Execution (not available)',
  configured: false,

  placeOrder() { return rejected(); },
  cancelOrder() { throw new Error(NOT_CONFIGURED); },
  modifyOrder() { throw new Error(NOT_CONFIGURED); },
  getOrders() { return []; },
  getPositions() { return []; },
  getTrades() { return []; },
};
