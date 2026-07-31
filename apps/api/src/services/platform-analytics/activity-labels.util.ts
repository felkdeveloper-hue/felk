export function humanizeActivityLabel(
  name: string,
  ctx: { userName?: string | null; productName?: string | null; query?: string | null },
): string {
  const who = ctx.userName || 'Someone';
  const product = ctx.productName || 'a product';
  switch (name) {
    case 'product_viewed':
    case 'product_detail_opened':
      return `${who} viewed ${product}`;
    case 'add_to_cart':
      return `${who} added ${product} to Cart`;
    case 'add_to_wishlist':
      return `${who} added ${product} to Wishlist`;
    case 'checkout_started':
      return `${who} started Checkout`;
    case 'checkout_abandoned':
      return `${who} abandoned Checkout`;
    case 'payment_completed':
      return `${who} completed Payment`;
    case 'payment_failed':
      return `${who} had a Payment fail`;
    case 'signup':
      return `${who} signed up`;
    case 'login':
      return `${who} logged in`;
    case 'order_delivered':
      return `${who} order was Delivered`;
    case 'order_updated':
      return `${who} order was Updated`;
    case 'search':
      return ctx.query ? `${who} searched “${ctx.query}”` : `${who} searched`;
    default:
      return `${who} · ${name.replace(/_/g, ' ')}`;
  }
}
