import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildAddToCartPixelParams,
  createAddToCartEventId,
  fireAddToCartPixel,
  prepareCartAddMeta,
  resetAddToCartPixelDedupe,
} from './add-to-cart-meta';

const metaPixelTrack = vi.fn();
const collectMetaBrowserParams = vi.fn();
const getMetaClickPayload = vi.fn();

vi.mock('@/lib/analytics/meta-pixel', () => ({
  metaPixelTrack: (...args: unknown[]) => metaPixelTrack(...args),
}));

vi.mock('@/lib/analytics/meta-param-builder', () => ({
  collectMetaBrowserParams: () => collectMetaBrowserParams(),
  getMetaClickPayload: () => getMetaClickPayload(),
}));

describe('AddToCart Meta helpers', () => {
  beforeEach(() => {
    resetAddToCartPixelDedupe();
    metaPixelTrack.mockReset();
    collectMetaBrowserParams.mockReset().mockResolvedValue(undefined);
    getMetaClickPayload.mockReset().mockReturnValue({
      fbp: 'fb.1.1554763741205.1234567890',
      fbc: 'fb.1.1554763741205.AbCdEf',
    });
  });

  it('builds commerce params and a shared event_id', () => {
    const eventId = createAddToCartEventId();
    expect(eventId.length).toBeGreaterThan(8);
    expect(
      buildAddToCartPixelParams({
        variantId: 'var_1',
        contentName: 'Silk Dress',
        unitPrice: 2500,
        quantity: 2,
      }),
    ).toEqual({
      content_ids: ['var_1'],
      contents: [{ id: 'var_1', quantity: 2, item_price: 2500 }],
      content_type: 'product',
      num_items: 2,
      currency: 'LKR',
      value: 5000,
      content_name: 'Silk Dress',
    });
  });

  it('prepares cart-add meta fields for the backend CAPI hop', async () => {
    const meta = await prepareCartAddMeta();
    expect(collectMetaBrowserParams).toHaveBeenCalledOnce();
    expect(meta.eventId.length).toBeGreaterThan(8);
    expect(meta.fbp).toBe('fb.1.1554763741205.1234567890');
    expect(meta.fbc).toBe('fb.1.1554763741205.AbCdEf');
  });

  it('fires Pixel AddToCart once with the provided event_id', async () => {
    await fireAddToCartPixel({
      eventId: 'evt-shared',
      variantId: 'var_1',
      contentName: 'Silk Dress',
      unitPrice: 2500,
      quantity: 1,
    });
    expect(metaPixelTrack).toHaveBeenCalledOnce();
    expect(metaPixelTrack).toHaveBeenCalledWith(
      'AddToCart',
      expect.objectContaining({ content_ids: ['var_1'], value: 2500 }),
      'evt-shared',
    );
  });

  it('does not fire Pixel twice for the same event_id', async () => {
    const input = {
      eventId: 'evt-once',
      variantId: 'var_1',
      contentName: 'Silk Dress',
      unitPrice: 2500,
      quantity: 1,
    };
    await fireAddToCartPixel(input);
    await fireAddToCartPixel(input);
    expect(metaPixelTrack).toHaveBeenCalledOnce();
  });

  it('does not fire Pixel if the cart add fails first', async () => {
    const cartAdd = vi.fn().mockRejectedValue(new Error('OUT_OF_STOCK'));
    await expect(
      (async () => {
        await cartAdd();
        await fireAddToCartPixel({
          eventId: 'evt-fail',
          variantId: 'var_1',
          contentName: 'Silk Dress',
          unitPrice: 2500,
          quantity: 1,
        });
      })(),
    ).rejects.toThrow('OUT_OF_STOCK');
    expect(cartAdd).toHaveBeenCalledOnce();
    expect(metaPixelTrack).not.toHaveBeenCalled();
  });
});
