import { EventEmitter } from 'node:events';
import { logger } from '@/config/logger';

/**
 * In-process domain event bus. Publishers (e.g. Payment Engine) have no idea
 * who — if anyone — is listening; consumers (e.g. Order Management) subscribe
 * without the publisher importing them. This is *in addition* to each
 * module's durable outbox collection (e.g. `payment_events`), not instead of
 * it — the outbox is the source of truth, this bus is just the real-time
 * delivery path within a single process.
 */
class DomainEventBus extends EventEmitter {
  publish(type: string, payload: Record<string, unknown>, refs?: Record<string, unknown>): void {
    // Listeners are async and must never crash the publisher or the process.
    for (const listener of this.listeners(type)) {
      void Promise.resolve()
        .then(() =>
          (
            listener as (
              payload: Record<string, unknown>,
              refs?: Record<string, unknown>,
            ) => unknown
          )(payload, refs),
        )
        .catch((error) => {
          logger.error({ err: error, type }, 'Domain event listener failed');
        });
    }
  }
}

export const domainEventBus = new DomainEventBus();
domainEventBus.setMaxListeners(100);
