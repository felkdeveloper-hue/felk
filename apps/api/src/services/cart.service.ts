import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { Types } from 'mongoose';
import {
  CartModel,
  CartItemModel,
  type CartDocument,
  type CartItemDocument,
} from '@/models/cart.models';
import { ProductModel, ProductVariantModel } from '@/models/product.models';
import { InventoryItemModel } from '@/models/inventory.models';
import { ColorModel, SizeModel } from '@/models/master-data.models';
import { customerService } from '@/services/customer.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { computePricing } from '@/utils/pricing.helper';
import { computeAvailable } from '@/utils/stock.helper';
import {
  CART_AUDIT,
  CART_ITEM_LOCATION,
  CART_QTY,
  CART_STATUS,
  GUEST_CART_COOKIE,
  GUEST_CART_HEADER,
} from '@/constants/cart';
import { PRODUCT_STATUS, VARIANT_STATUS } from '@/constants/product';
import type { AuthenticatedUser } from '@/types';

export interface CartTotals {
  currency: string;
  subtotal: number;
  discount: number;
  discountPlaceholder: number;
  estimatedTax: number;
  estimatedShipping: number;
  grandTotal: number;
  totalWeightGrams: number;
  totalQuantity: number;
  itemCount: number;
  taxEstimate: {
    status: 'placeholder';
    message: string;
    amount: number;
  };
  shippingEstimate: {
    status: 'placeholder';
    message: string;
    amount: number;
  };
}

export interface CartView {
  cart: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  savedForLater: Array<Record<string, unknown>>;
  totals: CartTotals;
  guestCartToken?: string | null;
  validation?: { valid: boolean; issues: ValidationIssue[] };
}

export interface ValidationIssue {
  code: string;
  message: string;
  itemId?: string;
  variantId?: string;
  severity: 'error' | 'warning';
}

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

export function extractGuestToken(req: Request): string | undefined {
  const header = req.get(GUEST_CART_HEADER)?.trim();
  if (header) return header;
  const cookie = req.cookies?.[GUEST_CART_COOKIE] as string | undefined;
  return cookie?.trim() || undefined;
}

export class CartService {
  async resolveOwner(req: Request): Promise<{
    customerId?: string;
    guestToken?: string;
    user?: AuthenticatedUser;
  }> {
    if (req.user) {
      const customer = await customerService.ensureForUser(req.user, {
        userId: req.user.id,
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
        requestId: req.requestId,
      });
      return { customerId: customer._id.toString(), user: req.user };
    }

    let guestToken = extractGuestToken(req);
    if (!guestToken) {
      guestToken = randomUUID();
    }
    return { guestToken };
  }

  async getOrCreateCart(owner: {
    customerId?: string;
    guestToken?: string;
  }): Promise<CartDocument> {
    if (!owner.customerId && !owner.guestToken) {
      throw ApiError.badRequest('Cart owner required');
    }

    const filter: Record<string, unknown> = {
      status: CART_STATUS.ACTIVE,
      isDeleted: false,
    };
    if (owner.customerId) {
      filter.customerId = owner.customerId;
    } else {
      filter.guestToken = owner.guestToken;
      filter.customerId = null;
    }

    let cart = await CartModel.findOne(filter);
    if (cart) return cart;

    try {
      cart = await CartModel.create({
        customerId: owner.customerId ?? null,
        guestToken: owner.customerId ? null : owner.guestToken,
        currency: 'LKR',
        status: CART_STATUS.ACTIVE,
      });
      return cart;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        const existing = await CartModel.findOne(filter);
        if (existing) return existing;
      }
      throw error;
    }
  }

  async getAvailableStock(variantId: string, warehouseId?: string): Promise<number> {
    const filter: Record<string, unknown> = {
      variantId,
      isDeleted: false,
    };
    if (warehouseId) filter.warehouseId = warehouseId;

    const rows = await InventoryItemModel.find(filter)
      .select('available onHand reserved damaged')
      .lean();
    // No inventory rows yet = stock not tracked; allow purchase up to the cart line max.
    if (!rows.length) return CART_QTY.MAX;
    return rows.reduce((sum, row) => {
      const sellable = computeAvailable(
        Number(row.onHand ?? 0),
        Number(row.reserved ?? 0),
        Number(row.damaged ?? 0),
      );
      // Prefer bucket math; fall back to stored available when buckets are empty.
      return sum + (sellable > 0 ? sellable : Number(row.available ?? 0));
    }, 0);
  }

  private async loadVariantContext(variantId: string) {
    const variant = await ProductVariantModel.findOne({
      _id: variantId,
      isDeleted: false,
    });
    if (!variant) {
      throw ApiError.notFound('Variant not found', 'VARIANT_NOT_FOUND');
    }

    const product = await ProductModel.findOne({
      _id: variant.productId,
      isDeleted: false,
    });
    if (!product) {
      throw ApiError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
    }

    const [color, size] = await Promise.all([
      variant.colorId ? ColorModel.findById(variant.colorId).select('name').lean() : null,
      variant.sizeId ? SizeModel.findById(variant.sizeId).select('name').lean() : null,
    ]);

    const pricing = computePricing({
      price: variant.price,
      salePrice: variant.salePrice,
      compareAtPrice: variant.compareAtPrice,
      saleStartsAt: variant.saleStartsAt,
      saleEndsAt: variant.saleEndsAt,
    });

    return { variant, product, color, size, pricing };
  }

  async validateLineQuantity(
    variantId: string,
    quantity: number,
    opts?: { warehouseId?: string; excludeItemId?: string; cartId?: string },
  ): Promise<{ available: number; issues: ValidationIssue[] }> {
    const issues: ValidationIssue[] = [];

    if (!Number.isInteger(quantity) || quantity < CART_QTY.MIN) {
      issues.push({
        code: 'MIN_QUANTITY',
        message: `Quantity must be at least ${CART_QTY.MIN}`,
        variantId,
        severity: 'error',
      });
    }
    if (quantity > CART_QTY.MAX) {
      issues.push({
        code: 'MAX_QUANTITY',
        message: `Quantity cannot exceed ${CART_QTY.MAX}`,
        variantId,
        severity: 'error',
      });
    }

    const { variant, product } = await this.loadVariantContext(variantId);

    if (variant.status !== VARIANT_STATUS.ACTIVE) {
      issues.push({
        code: 'VARIANT_INACTIVE',
        message: 'Variant is not active',
        variantId,
        severity: 'error',
      });
    }

    if (product.status !== PRODUCT_STATUS.ACTIVE) {
      issues.push({
        code: 'PRODUCT_INACTIVE',
        message: `Product status is ${product.status}`,
        variantId,
        severity: 'error',
      });
    }

    const available = await this.getAvailableStock(variantId, opts?.warehouseId);

    // Account for other cart lines of same variant in this cart
    let alreadyInCart = 0;
    if (opts?.cartId) {
      const others = await CartItemModel.find({
        cartId: opts.cartId,
        variantId,
        location: CART_ITEM_LOCATION.CART,
        isDeleted: false,
        ...(opts.excludeItemId ? { _id: { $ne: opts.excludeItemId } } : {}),
      }).select('quantity');
      alreadyInCart = others.reduce((s, i) => s + i.quantity, 0);
    }

    const requestedTotal = quantity + alreadyInCart;
    if (available <= 0) {
      issues.push({
        code: 'OUT_OF_STOCK',
        message: 'Variant is out of stock',
        variantId,
        severity: 'error',
      });
    } else if (requestedTotal > available) {
      issues.push({
        code: 'INSUFFICIENT_STOCK',
        message: `Only ${available} available (requested ${requestedTotal})`,
        variantId,
        severity: 'error',
      });
    }

    return { available, issues };
  }

  calculateTotals(
    items: Array<{
      quantity: number;
      currentPrice: number;
      weightGrams: number;
      location: string;
    }>,
    currency: string,
  ): CartTotals {
    const cartItems = items.filter((i) => i.location === CART_ITEM_LOCATION.CART);
    const subtotal = Number(
      cartItems.reduce((s, i) => s + i.currentPrice * i.quantity, 0).toFixed(2),
    );
    const totalQuantity = cartItems.reduce((s, i) => s + i.quantity, 0);
    const totalWeightGrams = cartItems.reduce((s, i) => s + (i.weightGrams || 0) * i.quantity, 0);

    const discount = 0;
    const estimatedTax = 0;
    const estimatedShipping = 0;
    const grandTotal = Number((subtotal - discount + estimatedTax + estimatedShipping).toFixed(2));

    return {
      currency,
      subtotal,
      discount,
      discountPlaceholder: 0,
      estimatedTax,
      estimatedShipping,
      grandTotal,
      totalWeightGrams,
      totalQuantity,
      itemCount: cartItems.length,
      taxEstimate: {
        status: 'placeholder',
        message: 'Tax estimate reserved for checkout / tax module',
        amount: estimatedTax,
      },
      shippingEstimate: {
        status: 'placeholder',
        message: 'Shipping estimate reserved for checkout / shipping module',
        amount: estimatedShipping,
      },
    };
  }

  private async refreshItemPricing(item: CartItemDocument) {
    const { pricing, variant } = await this.loadVariantContext(item.variantId.toString());
    const currentPrice = pricing.effectivePrice;
    const priceDifference = Number((currentPrice - item.priceAtAdd).toFixed(2));
    const priceChanged = Math.abs(priceDifference) > 0.001;

    item.currentPrice = currentPrice;
    item.salePrice = pricing.salePrice;
    item.compareAtPrice = pricing.compareAtPrice ?? variant.compareAtPrice ?? null;
    item.priceChanged = priceChanged;
    item.priceDifference = priceDifference;
    item.lineSubtotal = Number((currentPrice * item.quantity).toFixed(2));
    item.weightGrams = variant.weightGrams ?? item.weightGrams ?? 0;
    await item.save();
    return item;
  }

  private async enrichItemsWithProductSlug(
    items: CartItemDocument[],
  ): Promise<Array<Record<string, unknown>>> {
    if (!items.length) return [];

    const productIds = [...new Set(items.map((item) => item.productId.toString()))];
    const products = await ProductModel.find({ _id: { $in: productIds }, isDeleted: false })
      .select('slug')
      .lean();
    const slugByProductId = new Map(products.map((product) => [String(product._id), product.slug]));

    return items.map((item) => ({
      ...toPlain(item),
      productSlug: slugByProductId.get(item.productId.toString()) ?? null,
    }));
  }

  async buildView(
    cart: CartDocument,
    options?: { validate?: boolean; guestCartToken?: string | null },
  ): Promise<CartView> {
    const allItems = await CartItemModel.find({
      cartId: cart._id,
      isDeleted: false,
    }).sort({ updatedAt: -1 });

    for (const item of allItems) {
      if (item.location === CART_ITEM_LOCATION.CART) {
        try {
          await this.refreshItemPricing(item);
        } catch {
          // keep snapshot if catalog vanished; validation will flag
        }
      }
    }

    const fresh = await CartItemModel.find({
      cartId: cart._id,
      isDeleted: false,
    }).sort({ updatedAt: -1 });

    const items = fresh.filter((i) => i.location === CART_ITEM_LOCATION.CART);
    const saved = fresh.filter((i) => i.location === CART_ITEM_LOCATION.SAVED);
    const totals = this.calculateTotals(fresh, cart.currency);
    const [enrichedItems, enrichedSaved] = await Promise.all([
      this.enrichItemsWithProductSlug(items),
      this.enrichItemsWithProductSlug(saved),
    ]);

    const view: CartView = {
      cart: toPlain(cart),
      items: enrichedItems,
      savedForLater: enrichedSaved,
      totals,
      guestCartToken: options?.guestCartToken ?? cart.guestToken ?? null,
    };

    if (options?.validate) {
      view.validation = await this.validateCart(cart._id.toString());
    }

    return view;
  }

  async getCart(owner: { customerId?: string; guestToken?: string }): Promise<CartView> {
    const cart = await this.getOrCreateCart(owner);
    return this.buildView(cart, {
      guestCartToken: owner.guestToken ?? cart.guestToken,
    });
  }

  async addItem(
    owner: { customerId?: string; guestToken?: string },
    payload: {
      variantId: string;
      quantity?: number;
      warehouseId?: string;
    },
    actor: ActorMeta,
  ): Promise<CartView> {
    const quantity = payload.quantity ?? 1;
    const cart = await this.getOrCreateCart(owner);
    const { variant, product, color, size, pricing } = await this.loadVariantContext(
      payload.variantId,
    );

    const { issues } = await this.validateLineQuantity(payload.variantId, quantity, {
      warehouseId: payload.warehouseId,
      cartId: cart._id.toString(),
    });
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length) {
      const first = errors[0]!;
      throw ApiError.unprocessable(first.message, { issues: errors }, first.code);
    }

    const existing = await CartItemModel.findOne({
      cartId: cart._id,
      variantId: payload.variantId,
      location: CART_ITEM_LOCATION.CART,
      isDeleted: false,
    });

    if (existing) {
      const nextQty = existing.quantity + quantity;
      const recheck = await this.validateLineQuantity(payload.variantId, nextQty, {
        warehouseId: payload.warehouseId,
        cartId: cart._id.toString(),
        excludeItemId: existing._id.toString(),
      });
      if (recheck.issues.some((i) => i.severity === 'error')) {
        const err = recheck.issues.find((i) => i.severity === 'error')!;
        throw ApiError.unprocessable(err.message, { issues: recheck.issues }, err.code);
      }

      existing.quantity = nextQty;
      existing.currentPrice = pricing.effectivePrice;
      existing.salePrice = pricing.salePrice;
      existing.compareAtPrice = pricing.compareAtPrice;
      existing.priceDifference = Number((pricing.effectivePrice - existing.priceAtAdd).toFixed(2));
      existing.priceChanged = Math.abs(existing.priceDifference) > 0.001;
      existing.lineSubtotal = Number((pricing.effectivePrice * nextQty).toFixed(2));
      await existing.save();

      await writeAuditLog({
        action: CART_AUDIT.QUANTITY_CHANGED,
        resourceType: 'cart_items',
        resourceId: existing._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        metadata: { cartId: cart._id.toString(), quantity: nextQty },
      });
    } else {
      const item = await CartItemModel.create({
        cartId: cart._id,
        customerId: cart.customerId,
        guestToken: cart.guestToken,
        productId: product._id,
        variantId: variant._id,
        sku: variant.sku,
        title: variant.title || product.name,
        colorId: variant.colorId,
        sizeId: variant.sizeId,
        colorName: color?.name ?? null,
        sizeName: size?.name ?? null,
        quantity,
        location: CART_ITEM_LOCATION.CART,
        weightGrams: variant.weightGrams ?? 0,
        currency: variant.currency ?? cart.currency,
        priceAtAdd: pricing.effectivePrice,
        currentPrice: pricing.effectivePrice,
        salePrice: pricing.salePrice,
        compareAtPrice: pricing.compareAtPrice,
        priceChanged: false,
        priceDifference: 0,
        lineSubtotal: Number((pricing.effectivePrice * quantity).toFixed(2)),
        thumbnailUrl: variant.thumbnailUrl ?? null,
      });

      await writeAuditLog({
        action: CART_AUDIT.ITEM_ADDED,
        resourceType: 'cart_items',
        resourceId: item._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        after: toPlain(item),
        metadata: { cartId: cart._id.toString() },
      });
    }

    cart.currency = variant.currency ?? cart.currency;
    await cart.save();
    return this.buildView(cart, { guestCartToken: cart.guestToken });
  }

  async updateItem(
    owner: { customerId?: string; guestToken?: string },
    itemId: string,
    payload: { quantity: number; warehouseId?: string },
    actor: ActorMeta,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(owner);
    const item = await CartItemModel.findOne({
      _id: itemId,
      cartId: cart._id,
      isDeleted: false,
      location: CART_ITEM_LOCATION.CART,
    });
    if (!item) throw ApiError.notFound('Cart item not found');

    const { issues } = await this.validateLineQuantity(
      item.variantId.toString(),
      payload.quantity,
      {
        warehouseId: payload.warehouseId,
        cartId: cart._id.toString(),
        excludeItemId: itemId,
      },
    );
    if (issues.some((i) => i.severity === 'error')) {
      const err = issues.find((i) => i.severity === 'error')!;
      throw ApiError.unprocessable(err.message, { issues }, err.code);
    }

    item.quantity = payload.quantity;
    await this.refreshItemPricing(item);

    await writeAuditLog({
      action: CART_AUDIT.QUANTITY_CHANGED,
      resourceType: 'cart_items',
      resourceId: itemId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { quantity: payload.quantity, cartId: cart._id.toString() },
    });

    return this.buildView(cart, { guestCartToken: cart.guestToken });
  }

  async removeItem(
    owner: { customerId?: string; guestToken?: string },
    itemId: string,
    actor: ActorMeta,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(owner);
    const item = await CartItemModel.findOne({
      _id: itemId,
      cartId: cart._id,
      isDeleted: false,
    });
    if (!item) throw ApiError.notFound('Cart item not found');

    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();

    await writeAuditLog({
      action: CART_AUDIT.ITEM_REMOVED,
      resourceType: 'cart_items',
      resourceId: itemId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(item),
      metadata: { cartId: cart._id.toString() },
    });

    return this.buildView(cart, { guestCartToken: cart.guestToken });
  }

  async clear(
    owner: { customerId?: string; guestToken?: string },
    actor: ActorMeta,
    location: 'cart' | 'all' = 'cart',
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(owner);
    const filter: Record<string, unknown> = {
      cartId: cart._id,
      isDeleted: false,
    };
    if (location === 'cart') filter.location = CART_ITEM_LOCATION.CART;

    await CartItemModel.updateMany(filter, {
      $set: { isDeleted: true, deletedAt: new Date() },
    });

    await writeAuditLog({
      action: CART_AUDIT.CART_CLEARED,
      resourceType: 'carts',
      resourceId: cart._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { location },
    });

    return this.buildView(cart, { guestCartToken: cart.guestToken });
  }

  async saveForLater(
    owner: { customerId?: string; guestToken?: string },
    payload: { itemIds: string[] },
    actor: ActorMeta,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(owner);
    const items = await CartItemModel.find({
      _id: { $in: payload.itemIds },
      cartId: cart._id,
      location: CART_ITEM_LOCATION.CART,
      isDeleted: false,
    });

    for (const item of items) {
      // Unique index is per location — if saved duplicate exists, merge qty then delete cart line
      const saved = await CartItemModel.findOne({
        cartId: cart._id,
        variantId: item.variantId,
        location: CART_ITEM_LOCATION.SAVED,
        isDeleted: false,
      });

      if (saved) {
        saved.quantity = Math.max(saved.quantity, item.quantity);
        await saved.save();
        item.isDeleted = true;
        item.deletedAt = new Date();
        await item.save();
      } else {
        item.location = CART_ITEM_LOCATION.SAVED;
        await item.save();
      }
    }

    await writeAuditLog({
      action: CART_AUDIT.SAVED_FOR_LATER,
      resourceType: 'carts',
      resourceId: cart._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { itemIds: payload.itemIds },
    });

    return this.buildView(cart, { guestCartToken: cart.guestToken });
  }

  async restore(
    owner: { customerId?: string; guestToken?: string },
    payload: { itemIds: string[]; warehouseId?: string },
    actor: ActorMeta,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(owner);
    const items = await CartItemModel.find({
      _id: { $in: payload.itemIds },
      cartId: cart._id,
      location: CART_ITEM_LOCATION.SAVED,
      isDeleted: false,
    });

    for (const item of items) {
      const { issues } = await this.validateLineQuantity(item.variantId.toString(), item.quantity, {
        warehouseId: payload.warehouseId,
        cartId: cart._id.toString(),
      });
      if (issues.some((i) => i.severity === 'error')) {
        const err = issues.find((i) => i.severity === 'error')!;
        throw ApiError.unprocessable(
          `Cannot restore ${item.sku}: ${err.message}`,
          { issues, itemId: item._id.toString() },
          err.code,
        );
      }

      const inCart = await CartItemModel.findOne({
        cartId: cart._id,
        variantId: item.variantId,
        location: CART_ITEM_LOCATION.CART,
        isDeleted: false,
      });

      if (inCart) {
        // Keep latest / max quantity when combining
        const nextQty = Math.max(inCart.quantity, item.quantity);
        const recheck = await this.validateLineQuantity(item.variantId.toString(), nextQty, {
          warehouseId: payload.warehouseId,
          cartId: cart._id.toString(),
          excludeItemId: inCart._id.toString(),
        });
        if (recheck.issues.some((i) => i.severity === 'error')) {
          const err = recheck.issues.find((i) => i.severity === 'error')!;
          throw ApiError.unprocessable(err.message, { issues: recheck.issues }, err.code);
        }
        inCart.quantity = nextQty;
        await this.refreshItemPricing(inCart);
        item.isDeleted = true;
        item.deletedAt = new Date();
        await item.save();
      } else {
        item.location = CART_ITEM_LOCATION.CART;
        await this.refreshItemPricing(item);
      }
    }

    await writeAuditLog({
      action: CART_AUDIT.RESTORED,
      resourceType: 'carts',
      resourceId: cart._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { itemIds: payload.itemIds },
    });

    return this.buildView(cart, { guestCartToken: cart.guestToken });
  }

  /**
   * Merge guest cart into authenticated customer cart.
   * Duplicate variants: keep latest quantity (guest wins if guest item is newer).
   */
  async merge(customerId: string, guestToken: string, actor: ActorMeta): Promise<CartView> {
    const customerCart = await this.getOrCreateCart({ customerId });
    const guestCart = await CartModel.findOne({
      guestToken,
      status: CART_STATUS.ACTIVE,
      isDeleted: false,
    });

    if (!guestCart || guestCart._id.toString() === customerCart._id.toString()) {
      return this.buildView(customerCart);
    }

    const guestItems = await CartItemModel.find({
      cartId: guestCart._id,
      isDeleted: false,
    });

    for (const gItem of guestItems) {
      const existing = await CartItemModel.findOne({
        cartId: customerCart._id,
        variantId: gItem.variantId,
        location: gItem.location,
        isDeleted: false,
      });

      if (existing) {
        const keepGuestQty = gItem.updatedAt >= existing.updatedAt;
        const quantity = keepGuestQty ? gItem.quantity : existing.quantity;
        existing.quantity = quantity;
        if (gItem.location === CART_ITEM_LOCATION.CART) {
          await this.refreshItemPricing(existing);
        } else {
          await existing.save();
        }
        gItem.isDeleted = true;
        gItem.deletedAt = new Date();
        await gItem.save();
      } else {
        gItem.cartId = customerCart._id as Types.ObjectId;
        gItem.customerId = new Types.ObjectId(customerId);
        gItem.guestToken = null;
        if (gItem.location === CART_ITEM_LOCATION.CART) {
          await this.refreshItemPricing(gItem);
        } else {
          await gItem.save();
        }
      }
    }

    guestCart.status = CART_STATUS.MERGED;
    guestCart.mergedIntoCartId = customerCart._id as Types.ObjectId;
    await guestCart.save();

    await writeAuditLog({
      action: CART_AUDIT.CART_MERGED,
      resourceType: 'carts',
      resourceId: customerCart._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: {
        guestCartId: guestCart._id.toString(),
        guestToken,
      },
    });

    return this.buildView(customerCart);
  }

  async validateCart(cartId: string): Promise<{ valid: boolean; issues: ValidationIssue[] }> {
    const items = await CartItemModel.find({
      cartId,
      location: CART_ITEM_LOCATION.CART,
      isDeleted: false,
    });

    const issues: ValidationIssue[] = [];
    for (const item of items) {
      try {
        const { issues: lineIssues } = await this.validateLineQuantity(
          item.variantId.toString(),
          item.quantity,
          { cartId, excludeItemId: item._id.toString() },
        );
        for (const issue of lineIssues) {
          issues.push({ ...issue, itemId: item._id.toString() });
        }

        const refreshed = await this.refreshItemPricing(item);
        if (refreshed.priceChanged) {
          issues.push({
            code: 'PRICE_CHANGED',
            message: `Price changed by ${refreshed.priceDifference}`,
            itemId: item._id.toString(),
            variantId: item.variantId.toString(),
            severity: 'warning',
          });
        }
      } catch (error) {
        issues.push({
          code: 'VARIANT_INVALID',
          message: error instanceof Error ? error.message : 'Invalid cart line',
          itemId: item._id.toString(),
          severity: 'error',
        });
      }
    }

    return {
      valid: !issues.some((i) => i.severity === 'error'),
      issues,
    };
  }

  async adminGetByCustomerId(customerId: string): Promise<CartView> {
    const cart = await CartModel.findOne({
      customerId,
      status: CART_STATUS.ACTIVE,
      isDeleted: false,
    });
    if (!cart) {
      return {
        cart: { customerId, status: 'empty' },
        items: [],
        savedForLater: [],
        totals: this.calculateTotals([], 'LKR'),
      };
    }
    return this.buildView(cart);
  }
}

export const cartService = new CartService();
