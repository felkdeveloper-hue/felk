import { trackEvent } from './auto-track';

/** Minimal product shape accepted from catalog / cart line items. */
export interface ProductLike {
  id?: string;
  productId?: string;
  name?: string;
  sku?: string;
  categoryName?: string;
  category?: string | { name?: string };
  defaultVariantId?: string;
  price?: number | { amount?: number } | null;
  salePrice?: number | { amount?: number } | null;
  effectivePrice?: number | { amount?: number } | null;
  currency?: string;
}

function readAmount(price: ProductLike['price']): number | null {
  if (typeof price === 'number') return price;
  if (price && typeof price === 'object' && typeof price.amount === 'number') return price.amount;
  return null;
}

export function productMetaFrom(
  product: ProductLike,
  opts?: { variantId?: string | null; variantLabel?: string | null; quantity?: number },
): CommerceProductMeta {
  const category =
    typeof product.category === 'string'
      ? product.category
      : (product.category?.name ?? product.categoryName ?? null);
  const price =
    readAmount(product.salePrice) ??
    readAmount(product.effectivePrice) ??
    readAmount(product.price);

  return {
    productId: product.id ?? product.productId ?? null,
    productName: product.name ?? null,
    sku: product.sku ?? null,
    category,
    variantId: opts?.variantId ?? product.defaultVariantId ?? null,
    variantLabel: opts?.variantLabel ?? null,
    price,
    quantity: opts?.quantity ?? 1,
    currency: product.currency ?? 'LKR',
  };
}

export type CommerceEventName =
  | 'product_viewed'
  | 'product_card_clicked'
  | 'product_image_clicked'
  | 'product_quick_view'
  | 'product_detail_opened'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'quantity_increased'
  | 'quantity_decreased'
  | 'add_to_wishlist'
  | 'remove_from_wishlist'
  | 'buy_now_clicked'
  | 'checkout_started'
  | 'checkout_shipping_reached'
  | 'checkout_review_reached'
  | 'checkout_abandoned'
  | 'payment_page_reached'
  | 'payment_failed'
  | 'payment_completed'
  | 'returned_to_cart'
  | 'search'
  | 'search_zero_results'
  | 'search_suggestion_clicked'
  | 'search_result_clicked';

export interface CommerceProductMeta {
  productId?: string | null;
  productName?: string | null;
  sku?: string | null;
  category?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
  price?: number | null;
  quantity?: number | null;
  currency?: string | null;
}

const PAYMENT_FAILED_FLAG = '_fe_payment_failed';

export function markPaymentFailedFlag() {
  try {
    sessionStorage.setItem(PAYMENT_FAILED_FLAG, '1');
  } catch {
    /* ignore */
  }
}

export function consumePaymentFailedFlag(): boolean {
  try {
    const v = sessionStorage.getItem(PAYMENT_FAILED_FLAG);
    if (v) {
      sessionStorage.removeItem(PAYMENT_FAILED_FLAG);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Fire a platform-analytics commerce event with structured product metadata. */
export function trackCommerceEvent(
  name: CommerceEventName,
  product?: CommerceProductMeta | null,
  extra?: Record<string, unknown>,
): void {
  try {
    trackEvent(name, {
      ...(product
        ? {
            productId: product.productId ?? null,
            productName: product.productName ?? null,
            sku: product.sku ?? null,
            category: product.category ?? null,
            variantId: product.variantId ?? null,
            variantLabel: product.variantLabel ?? null,
            price: product.price ?? null,
            quantity: product.quantity ?? null,
            currency: product.currency ?? null,
          }
        : {}),
      ...(extra ?? {}),
    });
  } catch {
    /* tracking must never throw */
  }
}
