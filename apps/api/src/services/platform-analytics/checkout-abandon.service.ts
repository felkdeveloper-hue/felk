import { EventModel } from '@/models/analytics/index.js';
import type { AnalyticsFilter } from '@/schemas/analytics/index.js';
import { buildEventMatch, mergeMatch } from './analytics-query.builder.js';

function actorKey(e: { userId?: unknown; visitorId?: string | null; sessionId?: string | null }) {
  if (e.userId) return `u:${String(e.userId)}`;
  if (e.visitorId) return `v:${e.visitorId}`;
  if (e.sessionId) return `s:${e.sessionId}`;
  return null;
}

export async function getCheckoutAbandonAnalytics(filter: AnalyticsFilter) {
  const base = await buildEventMatch(filter);
  delete base['name'];

  const events = await EventModel.find(
    mergeMatch(base, {
      name: {
        $in: [
          'checkout_started',
          'checkout_shipping_reached',
          'payment_page_reached',
          'checkout_review_reached',
          'checkout_abandoned',
          'payment_completed',
          'payment_failed',
          'returned_to_cart',
        ],
      },
    }),
  )
    .select('name userId visitorId sessionId occurredAt properties')
    .sort({ occurredAt: 1 })
    .lean();

  let started = 0;
  let shipping = 0;
  let payment = 0;
  let review = 0;
  let abandoned = 0;
  let paid = 0;
  let recovered = 0;
  let revenueRecovered = 0;
  const returnTimes: number[] = [];
  const exitSteps = {
    started: 0,
    shipping: 0,
    payment: 0,
    review: 0,
  };

  type State = {
    maxStep: number;
    abandonedAt?: Date;
    paidAt?: Date;
    returnedAt?: Date;
  };
  const byActor = new Map<string, State>();

  for (const e of events) {
    const key = actorKey(e);
    if (!key) continue;
    const state = byActor.get(key) ?? { maxStep: 0 };

    switch (e.name) {
      case 'checkout_started':
        started++;
        state.maxStep = Math.max(state.maxStep, 1);
        break;
      case 'checkout_shipping_reached':
        shipping++;
        state.maxStep = Math.max(state.maxStep, 2);
        break;
      case 'payment_page_reached':
        payment++;
        state.maxStep = Math.max(state.maxStep, 3);
        break;
      case 'checkout_review_reached':
        review++;
        state.maxStep = Math.max(state.maxStep, 4);
        break;
      case 'checkout_abandoned':
        abandoned++;
        state.abandonedAt = e.occurredAt;
        break;
      case 'payment_failed':
        if (!state.abandonedAt) {
          abandoned++;
          state.abandonedAt = e.occurredAt;
        }
        break;
      case 'returned_to_cart':
        if (state.abandonedAt && e.occurredAt > state.abandonedAt) {
          state.returnedAt = e.occurredAt;
          returnTimes.push(e.occurredAt.getTime() - state.abandonedAt.getTime());
        }
        break;
      case 'payment_completed':
        paid++;
        state.paidAt = e.occurredAt;
        if (state.abandonedAt && e.occurredAt > state.abandonedAt) {
          recovered++;
          const amount = Number(e.properties?.amount ?? 0);
          if (!Number.isNaN(amount)) revenueRecovered += amount;
        }
        break;
      default:
        break;
    }
    byActor.set(key, state);
  }

  // Exit step: actors who started but never paid — last step reached
  for (const [, state] of byActor) {
    if (state.paidAt) continue;
    if (state.maxStep <= 0) continue;
    if (state.maxStep === 1) exitSteps.started++;
    else if (state.maxStep === 2) exitSteps.shipping++;
    else if (state.maxStep === 3) exitSteps.payment++;
    else exitSteps.review++;
  }

  const abandonRate = started > 0 ? Math.round(((started - paid) / started) * 1000) / 10 : 0;
  const recoveryRate = abandoned > 0 ? Math.round((recovered / abandoned) * 1000) / 10 : 0;
  const avgReturnMs = returnTimes.length
    ? Math.round(returnTimes.reduce((a, b) => a + b, 0) / returnTimes.length)
    : null;

  return {
    funnel: {
      checkoutStarted: started,
      shippingReached: shipping,
      paymentReached: payment,
      reviewReached: review,
      abandoned,
      paid,
    },
    exitSteps: [
      { step: 'After Start', count: exitSteps.started },
      { step: 'After Shipping', count: exitSteps.shipping },
      { step: 'After Payment Page', count: exitSteps.payment },
      { step: 'After Review', count: exitSteps.review },
    ],
    abandonRate,
    recoveryRate,
    recovered,
    revenueRecovered: Math.round(revenueRecovered * 100) / 100,
    avgTimeUntilReturnMs: avgReturnMs,
  };
}
