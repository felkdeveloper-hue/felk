import { appConfig } from '@/config/app.config.js';
import type { TrackingUserData } from '@/services/analytics/analytics.service.js';
import { resolveExplicitMetaClickIds } from '@/services/analytics/meta-param-builder.js';

type RequestMeta = {
  ip?: string;
  userAgent?: string;
  countryCode?: string;
};

export type CompleteRegistrationUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
};

function shopPath(path: string): string | undefined {
  const base = appConfig.email?.shopUrl?.replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}${path}`;
}

/**
 * Fire-and-forget CompleteRegistration. Must never throw into auth/checkout.
 */
export function trackCompleteRegistrationSafely(input: {
  user: CompleteRegistrationUser;
  customerId?: string | null;
  meta: RequestMeta;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  eventSourcePath?: string;
}): void {
  try {
    const click = resolveExplicitMetaClickIds({
      fbp: input.fbp,
      fbc: input.fbc,
      fbclid: input.fbclid,
    });

    const userData: TrackingUserData = {
      email: input.user.email,
      firstName: input.user.firstName || null,
      lastName: input.user.lastName || null,
      phone: input.user.phone || null,
      ipAddress: input.meta.ip ?? null,
      userAgent: input.meta.userAgent ?? null,
      country: input.meta.countryCode ?? null,
      externalId: input.customerId || input.user.id,
      fbp: click.fbp ?? null,
      fbc: click.fbc ?? null,
    };

    const eventSourceUrl = shopPath(input.eventSourcePath ?? '/auth/register');

    void import('@/services/analytics/analytics.service.js')
      .then(({ analyticsService }) =>
        analyticsService
          .trackCompleteRegistration(userData, undefined, eventSourceUrl)
          .catch(() => {}),
      )
      .catch(() => {});
  } catch {
    // Tracking must never affect registration.
  }
}
