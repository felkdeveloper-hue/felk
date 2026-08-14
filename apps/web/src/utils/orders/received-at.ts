function toIso(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return undefined;
}

/** Customer payment / order-received time. Never use fulfillment timestamps. */
export function orderReceivedAt(order: {
  receivedAt?: unknown;
  paidAt?: unknown;
  placedAt?: unknown;
  createdAt?: unknown;
}): string | undefined {
  return (
    toIso(order.receivedAt) ||
    toIso(order.paidAt) ||
    toIso(order.placedAt) ||
    toIso(order.createdAt)
  );
}
