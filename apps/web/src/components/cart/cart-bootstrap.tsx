import { useCartBootstrap } from '@/hooks/cart';

/** Load cart immediately so Add to cart / Buy now never wait on idle timers. */
export function CartBootstrap() {
  useCartBootstrap();
  return null;
}
