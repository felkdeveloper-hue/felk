import type { AuthUser } from '@/types';

/** True for one-click checkout guest sessions (ephemeral @guest.fe.lk accounts). */
export function isGuestCheckoutUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.checkoutGuest === true || user?.email?.endsWith('@guest.fe.lk'));
}
