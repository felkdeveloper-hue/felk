/**
 * "Received" is when the customer paid — never Ready for shipment / packed / shipped.
 *
 * Recovered Mintpay orders were inserted later, so order.createdAt and a late
 * payment.paidAt can be the recovery time. Prefer the original payment record time
 * when paidAt is far after the payment was created.
 */
const LATE_BOOKKEEPING_MS = 12 * 60 * 60 * 1000;

/** Mintpay merchant-portal purchase times for recovered orders (Sri Lanka local). */
export const MINTPAY_PURCHASE_RECEIVED_AT: Record<string, Date> = {
  '2975188': new Date('2026-08-11T18:50:00+05:30'),
  '2983159': new Date('2026-08-13T23:41:00+05:30'),
};

export function earliestDate(...values: Array<Date | string | null | undefined>): Date | undefined {
  let min: number | undefined;
  for (const value of values) {
    if (value == null) continue;
    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(time)) continue;
    if (min === undefined || time < min) min = time;
  }
  return min === undefined ? undefined : new Date(min);
}

export function mintpayPurchaseReceivedAt(payment: {
  gatewayPaymentId?: string | null;
  referenceNumber?: string | null;
  metadata?: Record<string, unknown> | null;
}): Date | undefined {
  const ids = [
    payment.gatewayPaymentId,
    typeof payment.metadata?.mintpayPurchaseId === 'string'
      ? payment.metadata.mintpayPurchaseId
      : null,
  ].filter((id): id is string => Boolean(id));
  for (const id of ids) {
    const known = MINTPAY_PURCHASE_RECEIVED_AT[id];
    if (known) return known;
  }
  const ref = payment.referenceNumber ?? '';
  if (ref.startsWith('PAY-MSRU476F')) return MINTPAY_PURCHASE_RECEIVED_AT['2983159'];
  if (/^PAY-MS0?OOU[IJ]ZP/i.test(ref)) return MINTPAY_PURCHASE_RECEIVED_AT['2975188'];
  return undefined;
}

export function paymentReceivedAt(payment: {
  paidAt?: Date | string | null;
  createdAt?: Date | string | null;
  gatewayPaymentId?: string | null;
  referenceNumber?: string | null;
  metadata?: Record<string, unknown> | null;
}): Date | undefined {
  const known = mintpayPurchaseReceivedAt(payment);
  if (known) return known;
  const created = earliestDate(payment.createdAt);
  const paid = earliestDate(payment.paidAt);
  if (paid && created && paid.getTime() - created.getTime() > LATE_BOOKKEEPING_MS) {
    return created;
  }
  return paid ?? created;
}

export function orderReceivedAt(order: {
  paidAt?: Date | string | null;
  placedAt?: Date | string | null;
  createdAt?: Date | string | null;
}): Date | undefined {
  return earliestDate(order.paidAt, order.placedAt, order.createdAt);
}

/** Mongo expression used by revenue / analytics date filters. */
export function orderReceivedAtExpr() {
  return { $ifNull: ['$paidAt', { $ifNull: ['$placedAt', '$createdAt'] }] };
}
