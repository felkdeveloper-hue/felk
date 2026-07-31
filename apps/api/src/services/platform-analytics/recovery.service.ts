import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';

function actorKey(e: { userId?: unknown; visitorId?: string | null }): string | null {
  if (e.userId) return `u:${String(e.userId)}`;
  if (e.visitorId) return `v:${e.visitorId}`;
  return null;
}

export async function getPaymentRecovery(filter: AnalyticsFilter) {
  const base = await buildEventMatch(filter);
  delete base['name'];

  const events = await EventModel.find(
    mergeMatch(base, {
      name: {
        $in: [
          'checkout_started',
          'payment_page_reached',
          'payment_failed',
          'returned_to_cart',
          'payment_completed',
        ],
      },
    }),
  )
    .select('name userId visitorId occurredAt')
    .sort({ occurredAt: 1 })
    .lean();

  let checkoutStarted = 0;
  let paymentPageReached = 0;
  let paymentFailed = 0;
  let returnedAfterFail = 0;
  let paymentSuccessful = 0;
  let recovered = 0;
  const recoveryTimes: number[] = [];

  const byActor = new Map<
    string,
    {
      failedAt?: Date;
      completedAt?: Date;
      returnedAt?: Date;
      started?: boolean;
    }
  >();

  for (const e of events) {
    const key = actorKey(e);
    if (!key) continue;
    const state = byActor.get(key) ?? {};

    switch (e.name) {
      case 'checkout_started':
        checkoutStarted++;
        state.started = true;
        break;
      case 'payment_page_reached':
        paymentPageReached++;
        break;
      case 'payment_failed':
        paymentFailed++;
        state.failedAt = e.occurredAt;
        break;
      case 'returned_to_cart':
        if (state.failedAt && e.occurredAt > state.failedAt) {
          returnedAfterFail++;
          state.returnedAt = e.occurredAt;
        }
        break;
      case 'payment_completed':
        paymentSuccessful++;
        state.completedAt = e.occurredAt;
        if (state.failedAt && e.occurredAt > state.failedAt) {
          recovered++;
          recoveryTimes.push(e.occurredAt.getTime() - state.failedAt.getTime());
        }
        break;
      default:
        break;
    }
    byActor.set(key, state);
  }

  const recoveryRate = paymentFailed > 0 ? Math.round((recovered / paymentFailed) * 1000) / 10 : 0;
  const medianRecoveryMs = median(recoveryTimes);

  return {
    funnel: {
      checkoutStarted,
      paymentPageReached,
      paymentFailed,
      returnedAfterFail,
      paymentSuccessful,
      recovered,
    },
    recoveryRate,
    medianRecoveryMs,
    avgRecoveryMs: recoveryTimes.length
      ? Math.round(recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length)
      : null,
  };
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}
