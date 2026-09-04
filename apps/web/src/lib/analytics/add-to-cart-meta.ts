import { metaPixelTrack } from '@/lib/analytics/meta-pixel';
import { collectMetaBrowserParams, getMetaClickPayload } from '@/lib/analytics/meta-param-builder';

export function createAddToCartEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function buildAddToCartPixelParams(input: {
  variantId: string;
  contentName: string;
  unitPrice: number;
  quantity: number;
  currency?: string;
}): Record<string, unknown> {
  const quantity = input.quantity > 0 ? input.quantity : 1;
  const unitPrice = Number.isFinite(input.unitPrice) ? input.unitPrice : 0;
  return {
    content_ids: [input.variantId],
    contents: [{ id: input.variantId, quantity, item_price: unitPrice }],
    content_type: 'product',
    num_items: quantity,
    currency: input.currency ?? 'LKR',
    value: Number((unitPrice * quantity).toFixed(2)),
    ...(input.contentName ? { content_name: input.contentName } : {}),
  };
}

export async function prepareCartAddMeta(): Promise<{
  eventId: string;
  fbp?: string;
  fbc?: string;
}> {
  await collectMetaBrowserParams();
  return {
    eventId: createAddToCartEventId(),
    ...getMetaClickPayload(),
  };
}

/** Browser Pixel only. CAPI is sent by POST /cart/items after the add succeeds. */
export async function fireAddToCartPixel(input: {
  eventId: string;
  variantId: string;
  contentName: string;
  unitPrice: number;
  quantity: number;
}): Promise<void> {
  await metaPixelTrack('AddToCart', buildAddToCartPixelParams(input), input.eventId);
}
