const PLACED_FLAG_PREFIX = 'fe:checkout-placed:';

export function readCheckoutPlacedFlag(checkoutToken: string | null): boolean {
  if (!checkoutToken || typeof sessionStorage === 'undefined') return false;
  return Boolean(sessionStorage.getItem(`${PLACED_FLAG_PREFIX}${checkoutToken}`));
}

export function setCheckoutPlacedFlag(checkoutToken: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(`${PLACED_FLAG_PREFIX}${checkoutToken}`, Date.now().toString());
}

export function clearCheckoutPlacedFlag(checkoutToken: string | null): void {
  if (!checkoutToken || typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(`${PLACED_FLAG_PREFIX}${checkoutToken}`);
}
