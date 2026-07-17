import { http, HttpResponse } from 'msw';

const API = 'http://localhost:4000/api/v1';

let cartState = createEmptyCart();

function createEmptyCart() {
  return {
    cart: { id: 'cart_test', status: 'active', currency: 'LKR' },
    items: [] as Array<Record<string, unknown>>,
    savedForLater: [],
    totals: {
      currency: 'LKR',
      subtotal: 0,
      discount: 0,
      discountPlaceholder: 0,
      estimatedTax: 0,
      estimatedShipping: 0,
      grandTotal: 0,
      totalQuantity: 0,
      itemCount: 0,
      taxEstimate: { status: 'placeholder', message: 'Calculated at checkout', amount: 0 },
      shippingEstimate: { status: 'placeholder', message: 'Calculated at checkout', amount: 0 },
    },
    guestCartToken: 'guest-cart-token-test',
  };
}

function recalcTotals() {
  const subtotal = cartState.items.reduce((sum, item) => sum + Number(item.lineSubtotal ?? 0), 0);
  cartState.totals = {
    ...cartState.totals,
    subtotal,
    grandTotal: subtotal,
    totalQuantity: cartState.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    itemCount: cartState.items.length,
  };
}

let wishlistState = {
  id: 'wl_1',
  name: 'Default',
  isDefault: true,
  itemCount: 1,
  items: [
    {
      id: 'wli_1',
      productId: {
        id: 'prod_1',
        name: 'Silk Column Dress',
        slug: 'silk-column-dress',
        status: 'active',
      },
      variantId: { id: 'var_1', sku: 'SCD-001', title: 'Default', price: 420 },
      addedAt: new Date().toISOString(),
    },
  ],
};

export const cartHandlers = [
  http.get(`${API}/cart`, () => HttpResponse.json({ success: true, data: cartState })),

  http.post(`${API}/cart/items`, async ({ request }) => {
    const body = (await request.json()) as { variantId: string; quantity?: number };
    const quantity = body.quantity ?? 1;
    const existing = cartState.items.find((item) => String(item.variantId) === body.variantId);

    if (existing) {
      existing.quantity = Number(existing.quantity) + quantity;
      existing.lineSubtotal = Number(existing.currentPrice) * Number(existing.quantity);
    } else {
      cartState.items.push({
        id: `item_${body.variantId}`,
        productId: 'prod_1',
        variantId: body.variantId,
        title: 'Silk Column Dress',
        sku: 'SCD-001',
        quantity,
        currentPrice: 420,
        lineSubtotal: 420 * quantity,
        thumbnailUrl: 'https://example.com/dress.jpg',
        colorName: 'Ivory',
        sizeName: 'M',
        currency: 'LKR',
        priceChanged: false,
        priceDifference: 0,
      });
    }

    recalcTotals();
    return HttpResponse.json({ success: true, data: cartState }, { status: 201 });
  }),

  http.patch(`${API}/cart/items/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { quantity: number };
    const item = cartState.items.find((entry) => entry.id === params.id);
    if (!item) {
      return HttpResponse.json(
        { success: false, error: { message: 'Item not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }
    item.quantity = body.quantity;
    item.lineSubtotal = Number(item.currentPrice) * body.quantity;
    recalcTotals();
    return HttpResponse.json({ success: true, data: cartState });
  }),

  http.delete(`${API}/cart/items/:id`, ({ params }) => {
    cartState.items = cartState.items.filter((entry) => entry.id !== params.id);
    recalcTotals();
    return HttpResponse.json({ success: true, data: cartState });
  }),

  http.post(`${API}/cart/merge`, () => {
    recalcTotals();
    return HttpResponse.json({ success: true, data: { ...cartState, guestCartToken: null } });
  }),

  http.post(`${API}/cart/validate`, () =>
    HttpResponse.json({
      success: true,
      data: {
        ...cartState,
        validation: { valid: true, issues: [] },
      },
    }),
  ),

  http.get(`${API}/customers/me/wishlists`, () =>
    HttpResponse.json({
      success: true,
      data: [
        {
          id: wishlistState.id,
          name: wishlistState.name,
          isDefault: true,
          itemCount: wishlistState.items.length,
        },
      ],
    }),
  ),

  http.get(`${API}/customers/me/wishlists/:wishlistId`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: { ...wishlistState, id: params.wishlistId, items: wishlistState.items },
    }),
  ),

  http.post(`${API}/customers/me/wishlists/:wishlistId/items`, async ({ request, params }) => {
    const body = (await request.json()) as { productId: string; variantId?: string };
    const duplicate = wishlistState.items.some(
      (item) =>
        String((item.productId as { id?: string }).id ?? item.productId) === body.productId &&
        (!body.variantId ||
          String((item.variantId as { id?: string }).id ?? item.variantId) === body.variantId),
    );
    if (!duplicate) {
      wishlistState.items.unshift({
        id: `wli_${Date.now()}`,
        productId: {
          id: body.productId,
          name: 'Saved Product',
          slug: 'saved-product',
          status: 'active',
        },
        variantId: body.variantId
          ? { id: body.variantId, sku: 'SKU-NEW', title: 'Default', price: 250 }
          : null,
        addedAt: new Date().toISOString(),
      });
    }
    wishlistState.itemCount = wishlistState.items.length;
    return HttpResponse.json({ success: true, data: { ...wishlistState, id: params.wishlistId } });
  }),

  http.delete(`${API}/customers/me/wishlists/:wishlistId/items/:itemId`, ({ params }) => {
    wishlistState.items = wishlistState.items.filter((item) => item.id !== params.itemId);
    wishlistState.itemCount = wishlistState.items.length;
    return HttpResponse.json({ success: true, data: { ...wishlistState, id: params.wishlistId } });
  }),
];

export function resetCartFixtures() {
  cartState = createEmptyCart();
  wishlistState = {
    id: 'wl_1',
    name: 'Default',
    isDefault: true,
    itemCount: 1,
    items: [
      {
        id: 'wli_1',
        productId: {
          id: 'prod_1',
          name: 'Silk Column Dress',
          slug: 'silk-column-dress',
          status: 'active',
        },
        variantId: { id: 'var_1', sku: 'SCD-001', title: 'Default', price: 420 },
        addedAt: new Date().toISOString(),
      },
    ],
  };
}
