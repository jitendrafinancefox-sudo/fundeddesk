import type { BrokerAdapter, BrokerProvider } from "@v2/types/broker";

export function createBrokerAdapter(_provider: BrokerProvider): BrokerAdapter {
  throw new Error(
    "[web-terminal-v2] Broker adapter is not implemented. Broker integration is scheduled for a later phase.",
  );
}

export function isBrokerAdapter(value: unknown): value is BrokerAdapter {
  return (
    typeof value === "object" &&
    value !== null &&
    "provider" in value &&
    "placeOrder" in value &&
    "connect" in value
  );
}
