/**
 * lib/execution/ExecutionProvider.js — Phase 8
 *
 * The conceptual interface every execution provider implements. This file
 * defines shape via JSDoc only — no runtime behavior, no class hierarchy,
 * no framework. Its only job is to document the boundary so a future
 * broker provider can be written against the same contract the paper
 * provider already satisfies, without either one depending on the other.
 *
 * ORDER INTENT (what the UI asks for — never includes a fill or an ID):
 *   @typedef {object} OrderIntent
 *   @property {string} accountId
 *   @property {{exchange:string, token:string, symbol:string, underlying:string, kind:string}} instrument
 *   @property {'BUY'|'SELL'} side
 *   @property {number} lots
 *   @property {number} [lotSize]        real lot size when known (e.g. from the live option chain)
 *   @property {'MARKET'|'LIMIT'} orderType
 *   @property {number} [limitPrice]     required when orderType === 'LIMIT'
 *   @property {number} [stopLoss]
 *   @property {number} [takeProfit]
 *
 * EXECUTION RESULT (what a provider hands back — see lib/execution/normalize.js
 * for the full canonical order shape a provider's placeOrder ultimately
 * produces once the order settles into TradingStore/a future ledger):
 *   @typedef {object} ExecutionResult
 *   @property {'pending'|'executed'|'rejected'} status
 *   @property {string|null} orderId            this application's own order id
 *   @property {string|null} brokerOrderId       null until a real broker exists — NEVER fabricated
 *   @property {number} filledQuantity
 *   @property {number|null} averageFillPrice
 *   @property {string|null} rejectionReason
 *
 * METHODS a provider MAY implement — only what the current app can
 * actually support server-side or in-simulator; do not add methods no
 * caller can use yet (e.g. no order-book/depth method, since neither
 * provider has real market depth):
 *   placeOrder(intent)   -> ExecutionResult
 *   cancelOrder(id)      -> void
 *   modifyOrder(id, patch) -> void
 *   getOrders()          -> canonical order[]
 *   getPositions()       -> canonical position[]
 *   getTrades()          -> canonical trade[]
 *
 * A provider's `configured` flag tells callers whether it's safe to use.
 * PaperExecutionProvider is always configured. BrokerExecutionProvider is
 * never configured today — see its own file.
 */
export const EXECUTION_PROVIDER_INTERFACE = Object.freeze([
  'placeOrder', 'cancelOrder', 'modifyOrder', 'getOrders', 'getPositions', 'getTrades',
]);
