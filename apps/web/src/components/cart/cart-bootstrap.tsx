import { useCartBootstrap } from '@/hooks/cart';

/** Loads cart state and merges guest cart after login. */
export function CartBootstrap() {
  useCartBootstrap();
  return null;
}
