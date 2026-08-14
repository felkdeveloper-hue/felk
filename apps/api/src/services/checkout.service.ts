import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { CheckoutSessionModel, type CheckoutSessionDocument } from '@/models/checkout.models.js';
import { OrderModel } from '@/models/order.models.js';
import { InventoryItemModel, WarehouseModel } from '@/models/inventory.models.js';
import { CustomerAddressModel } from '@/models/customer.models.js';
import { cartService } from '@/services/cart.service.js';
import { reservationService } from '@/services/reservation.service.js';
import { customerService } from '@/services/customer.service.js';
import {
  applyCouponPlaceholder,
  applyFirstOrderDiscount,
  applyGiftCardPlaceholder,
  calculateShipping,
  calculateTax,
} from '@/services/checkout-calculators.js';
import { writeAuditLog } from '@/services/audit.service.js';
import type { ActorMeta } from '@/services/cms-crud.service.js';
import { ApiError } from '@/utils/errors/api-error.js';
import {
  CHECKOUT_AUDIT,
  CHECKOUT_RESERVATION_TTL_MINUTES,
  CHECKOUT_STATUS,
  DELIVERY_METHOD,
  FIRST_ORDER_DISCOUNT,
  SHIPPING_METHOD,
  type ShippingMethod,
} from '@/constants/checkout.js';
import { STAFF_ROLES } from '@/constants/auth.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import { UserModel } from '@/models/user.model.js';
import type { AuthenticatedUser } from '@/types/index.js';

function isStaffCheckout(roleKey?: string | null) {
  return Boolean(roleKey && (STAFF_ROLES as readonly string[]).includes(roleKey));
}

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function newCheckoutToken() {
  return `chk_${randomBytes(24).toString('hex')}`;
}

async function getDefaultWarehouseId(): Promise<string | null> {
  const defaultWh = await WarehouseModel.findOne({
    isDefault: true,
    isDeleted: false,
    status: 'active',
  })
    .select('_id')
    .lean();
  return defaultWh?._id.toString() ?? null;
}

function pickInventoryForVariant(
  items: Array<{ warehouseId: Types.ObjectId; available: number }>,
  quantity: number,
  defaultWarehouseId: string | null,
) {
  const sufficient = items.filter((i) => i.available >= quantity);
  const pool = sufficient.length ? sufficient : items;
  if (!pool.length) return null;

  if (defaultWarehouseId) {
    const atDefault = pool.find((i) => i.warehouseId.toString() === defaultWarehouseId);
    if (atDefault && atDefault.available >= quantity) return atDefault;
  }

  return pool[0] ?? null;
}

async function loadInventoryByVariant(
  variantIds: string[],
): Promise<
  Map<string, Array<{ warehouseId: Types.ObjectId; available: number; _id: Types.ObjectId }>>
> {
  if (!variantIds.length) return new Map();

  const rows = await InventoryItemModel.find({
    variantId: { $in: variantIds },
    isDeleted: false,
  })
    .select('variantId warehouseId available')
    .sort({ available: -1 })
    .lean();

  const byVariant = new Map<
    string,
    Array<{ warehouseId: Types.ObjectId; available: number; _id: Types.ObjectId }>
  >();

  for (const row of rows) {
    const key = String(row.variantId);
    const list = byVariant.get(key) ?? [];
    list.push({
      _id: row._id as Types.ObjectId,
      warehouseId: row.warehouseId as Types.ObjectId,
      available: row.available,
    });
    byVariant.set(key, list);
  }

  return byVariant;
}

export class CheckoutService {
  private async assertOwner(session: CheckoutSessionDocument, user: AuthenticatedUser) {
    const customer = await customerService.ensureForUser(user);
    const isOwner = session.customerId.toString() === customer._id.toString();
    const isAdmin = user.permissions.some(
      (p) => p === 'checkout.view' || p === 'customers.view' || p === 'customers.read',
    );
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You can only access your own checkout session');
    }
    return { customer, isOwner, isAdmin };
  }

  async getByIdOrToken(idOrToken: string) {
    if (Types.ObjectId.isValid(idOrToken)) {
      const byId = await CheckoutSessionModel.findOne({
        _id: idOrToken,
        isDeleted: false,
      });
      if (byId) return byId;
    }

    const byToken = await CheckoutSessionModel.findOne({
      checkoutToken: idOrToken,
      isDeleted: false,
    });
    if (!byToken) throw ApiError.notFound('Checkout session not found');
    return byToken;
  }

  private async loadAddressSnapshot(customerId: string, addressId?: string | null) {
    if (!addressId) return null;
    const address = await CustomerAddressModel.findOne({
      _id: addressId,
      customerId,
      isDeleted: false,
    });
    if (!address) throw ApiError.notFound('Address not found');
    return {
      addressId: address._id,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };
  }

  private async buildLinesFromCart(customerId: string) {
    const view = await cartService.getCart({ customerId });
    if (!view.items.length) {
      throw ApiError.badRequest('Cart is empty', undefined, 'CART_EMPTY');
    }

    // getCart already refreshed pricing; avoid a second full validateCart pass.
    // Stock is resolved from a single batched inventory query below.
    const issues: Array<{
      code: string;
      message: string;
      variantId?: string;
      severity: 'error' | 'warning';
    }> = [];

    const typedItems = view.items as Array<{
      _id: Types.ObjectId;
      productId: Types.ObjectId;
      variantId: Types.ObjectId;
      sku: string;
      title: string;
      quantity: number;
      currentPrice: number;
      salePrice?: number | null;
      compareAtPrice?: number | null;
      lineSubtotal: number;
      weightGrams: number;
      priceChanged?: boolean;
      colorName?: string | null;
      sizeName?: string | null;
      thumbnailUrl?: string | null;
      availableQuantity?: number;
      inStock?: boolean;
    }>;

    const [defaultWarehouseId, inventoryByVariant] = await Promise.all([
      getDefaultWarehouseId(),
      loadInventoryByVariant(typedItems.map((item) => item.variantId.toString())),
    ]);

    const lines = typedItems.map((item) => {
      const invRows = inventoryByVariant.get(item.variantId.toString()) ?? [];
      const inv = pickInventoryForVariant(invRows, item.quantity, defaultWarehouseId);
      // Prefer cart-enriched availability (bucket math). Untracked = sellable.
      const available =
        typeof item.availableQuantity === 'number'
          ? item.availableQuantity
          : invRows.length
            ? invRows.reduce((sum, row) => sum + Number(row.available ?? 0), 0)
            : item.quantity;

      if (available < item.quantity) {
        issues.push({
          code: available <= 0 ? 'OUT_OF_STOCK' : 'INSUFFICIENT_STOCK',
          message:
            available <= 0 ? `${item.title} is out of stock` : `Insufficient stock for ${item.sku}`,
          variantId: item.variantId.toString(),
          severity: 'error',
        });
      }

      if (item.priceChanged) {
        issues.push({
          code: 'PRICE_CHANGED',
          message: `Price changed for ${item.sku}`,
          variantId: item.variantId.toString(),
          severity: 'warning',
        });
      }

      return {
        cartItemId: item._id,
        productId: item.productId,
        variantId: item.variantId,
        sku: item.sku,
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.currentPrice,
        salePrice: item.salePrice ?? null,
        compareAtPrice: item.compareAtPrice ?? null,
        lineSubtotal: item.lineSubtotal,
        colorName: item.colorName ?? null,
        sizeName: item.sizeName ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        weightGrams: item.weightGrams ?? 0,
        taxClass: null,
        warehouseId: available >= item.quantity ? (inv?.warehouseId ?? null) : null,
        reservationId: null,
      };
    });

    return {
      cartId: String(view.cart._id),
      currency: view.totals.currency,
      lines,
      issues,
      cartTotals: view.totals,
    };
  }

  private async recalculate(
    session: CheckoutSessionDocument,
    opts?: { couponCode?: string | null; giftCardCode?: string | null },
  ) {
    const subtotal = Number(session.lines.reduce((s, l) => s + l.lineSubtotal, 0).toFixed(2));
    const totalWeightGrams = session.lines.reduce(
      (s, l) => s + (l.weightGrams || 0) * l.quantity,
      0,
    );
    const totalQuantity = session.lines.reduce((s, l) => s + l.quantity, 0);

    const shippingAddress = session.shippingAddress as {
      country?: string;
      state?: string;
    } | null;

    const checkoutUser = session.userId
      ? await UserModel.findById(session.userId).select('metadata roleKey').lean()
      : null;

    const shippingEstimate = await calculateShipping({
      country: shippingAddress?.country,
      state: shippingAddress?.state,
      subtotal,
      totalWeightGrams,
      method: session.shippingMethod as ShippingMethod,
      currency: session.currency,
      waiveFee: isStaffCheckout(checkoutUser?.roleKey),
    });

    const taxEstimate = await calculateTax({
      country: shippingAddress?.country,
      state: shippingAddress?.state,
      subtotal,
      shipping: shippingEstimate.amount,
      currency: session.currency,
    });

    if (opts?.couponCode !== undefined) {
      session.coupon = applyCouponPlaceholder(opts.couponCode);
    }
    if (opts?.giftCardCode !== undefined) {
      session.giftCard = applyGiftCardPlaceholder(opts.giftCardCode);
    }

    // 5% first-order discount — signed-in accounts only (never guest checkout).
    const isGuestCheckout =
      Boolean((session.metadata as { isGuestCheckout?: boolean } | undefined)?.isGuestCheckout) ||
      (session.userId ? Boolean(checkoutUser?.metadata?.checkoutGuest) : true);
    const hasPriorOrder = await OrderModel.exists({
      customerId: session.customerId,
      isDeleted: false,
      status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] },
    });
    const couponCode = (session.coupon as { code?: string | null } | null)?.code ?? null;
    const couponAmount = Number((session.coupon as { amount?: number } | null)?.amount ?? 0);
    if (!isGuestCheckout && !hasPriorOrder && subtotal > 0) {
      session.coupon = applyFirstOrderDiscount(subtotal);
    } else if (couponCode === FIRST_ORDER_DISCOUNT.CODE || (!couponAmount && !couponCode)) {
      session.coupon = applyCouponPlaceholder(opts?.couponCode);
    }

    const discount = Number((session.coupon as { amount?: number })?.amount ?? 0);
    const giftCard = Number((session.giftCard as { amount?: number })?.amount ?? 0);
    const shipping = shippingEstimate.amount;
    const tax = taxEstimate.amount;
    const grandTotal = Number(
      Math.max(0, subtotal - discount - giftCard + shipping + tax).toFixed(2),
    );

    session.shippingEstimate = shippingEstimate as unknown as Record<string, unknown>;
    session.taxEstimate = taxEstimate as unknown as Record<string, unknown>;
    session.shippingZoneId = shippingEstimate.zoneId
      ? new Types.ObjectId(shippingEstimate.zoneId)
      : null;
    session.totals = {
      subtotal,
      discount,
      shipping,
      tax,
      giftCard,
      grandTotal,
      totalWeightGrams,
      totalQuantity,
    };

    return session;
  }

  private filterBuiltToVariantIds(
    built: Awaited<ReturnType<CheckoutService['buildLinesFromCart']>>,
    variantIds: string[],
  ) {
    const allow = new Set(variantIds);
    return {
      ...built,
      lines: built.lines.filter((line) => allow.has(line.variantId.toString())),
      issues: built.issues.filter(
        (issue) => !issue.variantId || allow.has(String(issue.variantId)),
      ),
    };
  }

  async start(
    user: AuthenticatedUser,
    payload: {
      shippingAddressId?: string;
      billingAddressId?: string;
      shippingMethod?: ShippingMethod;
      deliveryMethod?: string;
      couponCode?: string;
      giftCardCode?: string;
      autoReserve?: boolean;
      items?: Array<{ variantId: string; quantity: number }>;
    },
    actor: ActorMeta,
  ) {
    const customer = await customerService.ensureForUser(user, actor);
    const buyNowVariantIds = payload.items?.map((item) => item.variantId) ?? [];

    const existing = await CheckoutSessionModel.findOne({
      customerId: customer._id,
      status: { $in: [CHECKOUT_STATUS.OPEN, CHECKOUT_STATUS.RESERVED, CHECKOUT_STATUS.READY] },
      isDeleted: false,
    });

    if (existing) {
      // Reject duplicate unless expired, or already fulfilled into an order.
      const alreadyOrdered = await OrderModel.exists({ checkoutId: existing._id });
      if (alreadyOrdered) {
        existing.status = CHECKOUT_STATUS.COMPLETED;
        existing.reservationExpiresAt = null;
        await existing.save();
      } else if (existing.reservationExpiresAt && existing.reservationExpiresAt <= new Date()) {
        await this.expireSession(existing, actor);
      } else if (!buyNowVariantIds.length) {
        // Full-bag checkout: refresh the live session instead of cancel+recreate.
        // Cancel+recreate orphans tokens still on payment/review (first Pay click fails).
        const resumed = await this.refresh(
          existing.checkoutToken,
          user,
          {
            shippingAddressId: payload.shippingAddressId,
            billingAddressId: payload.billingAddressId,
            shippingMethod: payload.shippingMethod,
            deliveryMethod: payload.deliveryMethod,
            couponCode: payload.couponCode,
            giftCardCode: payload.giftCardCode,
          },
          actor,
        );
        if (payload.autoReserve === true) {
          return this.reserve(existing._id.toString(), user, actor, { skipRebuild: true });
        }
        return resumed;
      } else {
        // Buy Now — replace scoped session so lines match the clicked SKU.
        await this.cancel(existing.checkoutToken, user, actor);
      }
    }

    // Buy Now: ensure the clicked SKU is in the bag (without doubling qty if already there).
    if (payload.items?.length) {
      const cartView = await cartService.getCart({ customerId: customer._id.toString() });
      const inCart = new Set(
        (cartView.items as Array<{ variantId: Types.ObjectId | string }>).map((item) =>
          String(item.variantId),
        ),
      );
      for (const item of payload.items) {
        if (!inCart.has(item.variantId)) {
          await cartService.addItem(
            { customerId: customer._id.toString() },
            { variantId: item.variantId, quantity: item.quantity },
            actor,
          );
        }
      }
    }

    let built = await this.buildLinesFromCart(customer._id.toString());
    if (buyNowVariantIds.length) {
      built = this.filterBuiltToVariantIds(built, buyNowVariantIds);
      const qtyByVariant = new Map(
        (payload.items ?? []).map((item) => [item.variantId, item.quantity]),
      );
      built = {
        ...built,
        lines: built.lines.map((line) => {
          const quantity = qtyByVariant.get(line.variantId.toString()) ?? line.quantity;
          const unit = line.salePrice ?? line.unitPrice;
          return {
            ...line,
            quantity,
            lineSubtotal: Number((unit * quantity).toFixed(2)),
          };
        }),
      };
      if (!built.lines.length) {
        throw ApiError.badRequest('Buy Now item is not available', undefined, 'CART_EMPTY');
      }
    }

    const hardErrors = built.issues.filter((i) => i.severity === 'error');
    if (hardErrors.length) {
      throw ApiError.unprocessable(
        'Checkout validation failed',
        { issues: hardErrors },
        'CHECKOUT_INVALID',
      );
    }

    const shippingAddressId =
      payload.shippingAddressId ?? customer.defaultShippingAddressId?.toString();
    const billingAddressId =
      payload.billingAddressId ?? customer.defaultBillingAddressId?.toString() ?? shippingAddressId;

    const shippingAddress = await this.loadAddressSnapshot(
      customer._id.toString(),
      shippingAddressId,
    );
    const billingAddress =
      billingAddressId === shippingAddressId
        ? shippingAddress
        : await this.loadAddressSnapshot(customer._id.toString(), billingAddressId);

    const timeout = CHECKOUT_RESERVATION_TTL_MINUTES;
    const starter = await UserModel.findById(user.id).select('metadata').lean();
    const isGuestCheckout = Boolean(starter?.metadata?.checkoutGuest);

    let session = await CheckoutSessionModel.create({
      checkoutToken: newCheckoutToken(),
      customerId: customer._id,
      cartId: built.cartId,
      userId: user.id,
      status: CHECKOUT_STATUS.OPEN,
      currency: built.currency,
      lines: built.lines,
      shippingAddress,
      billingAddress,
      shippingMethod: payload.shippingMethod ?? SHIPPING_METHOD.STANDARD,
      deliveryMethod: payload.deliveryMethod ?? DELIVERY_METHOD.DELIVERY,
      coupon: applyCouponPlaceholder(payload.couponCode),
      giftCard: applyGiftCardPlaceholder(payload.giftCardCode),
      reservationIds: [],
      reservationTimeoutMinutes: timeout,
      // Session clock starts when Place Order reserves stock — not while browsing checkout.
      reservationExpiresAt: null,
      expiresAt: null,
      validationIssues: built.issues,
      metadata: {
        ...(buyNowVariantIds.length ? { buyNowVariantIds } : {}),
        ...(isGuestCheckout ? { isGuestCheckout: true } : {}),
      },
    });

    session = (await this.recalculate(session, {
      couponCode: payload.couponCode,
      giftCardCode: payload.giftCardCode,
    })) as typeof session;
    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.STARTED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: toPlain(session),
    });

    // Stock is reserved only at Place Order (payment create). Never hold inventory
    // while the customer is still filling address / payment details.
    if (payload.autoReserve === true) {
      return this.reserve(session._id.toString(), user, actor, { skipRebuild: true });
    }

    // Mark ready for the payment UI when address + lines exist — without a stock hold.
    if (shippingAddress && session.lines.length > 0) {
      session.status = CHECKOUT_STATUS.READY;
      await session.save();
    }

    return this.toSummary(session);
  }

  /**
   * Ensure a checkout can accept payment. Reopens cancelled/expired sessions that
   * still have lines + address and no order (stale token after start() raced).
   */
  async ensurePayableForPayment(idOrToken: string, user: AuthenticatedUser) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);

    if (
      [CHECKOUT_STATUS.OPEN, CHECKOUT_STATUS.READY, CHECKOUT_STATUS.RESERVED].includes(
        session.status as never,
      )
    ) {
      return session;
    }

    if (
      [CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED].includes(session.status as never) &&
      session.shippingAddress &&
      session.lines?.length
    ) {
      const alreadyOrdered = await OrderModel.exists({ checkoutId: session._id });
      if (!alreadyOrdered) {
        session.status = CHECKOUT_STATUS.READY;
        session.reservationExpiresAt = null;
        session.expiresAt = null;
        await session.save();
        return session;
      }
    }

    throw ApiError.badRequest(
      `Checkout is not ready for payment (status: ${session.status})`,
      { checkoutId: session._id.toString(), status: session.status },
      'CHECKOUT_NOT_READY',
    );
  }

  async get(idOrToken: string, user: AuthenticatedUser) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    // Allow reading closed sessions so the client can clear stale tokens and start fresh.
    // Only auto-expire live reserved/ready sessions past their TTL.
    if (
      ![CHECKOUT_STATUS.COMPLETED, CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED].includes(
        session.status as never,
      )
    ) {
      await this.ensureReservationNotExpired(session, { userId: user.id });
    }
    // Heal OPEN sessions that already have address + lines (ready for Place Order).
    if (
      session.status === CHECKOUT_STATUS.OPEN &&
      session.shippingAddress &&
      session.lines.length > 0
    ) {
      session.status = CHECKOUT_STATUS.READY;
      await session.save();
    }
    // Unpaid gateway redirects must not keep Available depressed. Release any
    // leftover hold when the shopper returns to checkout (payment not confirmed).
    if (
      session.reservationIds?.length &&
      [CHECKOUT_STATUS.OPEN, CHECKOUT_STATUS.READY, CHECKOUT_STATUS.RESERVED].includes(
        session.status as never,
      )
    ) {
      const released = await this.releaseForPaymentFailure(
        session._id.toString(),
        'Release unpaid hold when viewing checkout',
      );
      return released ?? this.toSummary(session);
    }
    return this.toSummary(session);
  }

  async validate(idOrToken: string, user: AuthenticatedUser, actor: ActorMeta) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    await this.assertMutable(session, actor);

    let rebuilt = await this.buildLinesFromCart(session.customerId.toString());
    const buyNowVariantIds = Array.isArray(session.metadata?.buyNowVariantIds)
      ? (session.metadata.buyNowVariantIds as string[])
      : [];
    if (buyNowVariantIds.length) {
      rebuilt = this.filterBuiltToVariantIds(rebuilt, buyNowVariantIds);
    }

    // Credit back any active hold for THIS checkout so validate does not flag
    // the shopper's own unpaid reservation as OUT_OF_STOCK.
    const heldByVariant = new Map<string, number>();
    const sessionHasHold = Boolean(session.reservationIds?.length);
    for (const prev of session.lines ?? []) {
      if (!prev.reservationId && !sessionHasHold) continue;
      const key = prev.variantId.toString();
      heldByVariant.set(key, (heldByVariant.get(key) ?? 0) + Number(prev.quantity ?? 0));
    }
    if (heldByVariant.size) {
      rebuilt = {
        ...rebuilt,
        lines: rebuilt.lines.map((line) => {
          const held = heldByVariant.get(line.variantId.toString()) ?? 0;
          if (!held || line.warehouseId) return line;
          // warehouseId was null only because available looked insufficient —
          // restore using the prior line's warehouse when we own the hold.
          const prev = session.lines.find(
            (l) => l.variantId.toString() === line.variantId.toString(),
          );
          return prev?.warehouseId ? { ...line, warehouseId: prev.warehouseId } : line;
        }),
        issues: rebuilt.issues.filter((issue) => {
          if (issue.code !== 'OUT_OF_STOCK' && issue.code !== 'INSUFFICIENT_STOCK') return true;
          const vid = issue.variantId ? String(issue.variantId) : '';
          return !vid || !heldByVariant.has(vid);
        }),
      };
    }

    // Preserve active reservation ids across rebuild.
    session.lines = rebuilt.lines.map((line) => {
      const prev = session.lines.find((l) => l.variantId.toString() === line.variantId.toString());
      return { ...line, reservationId: prev?.reservationId ?? null };
    }) as never;
    session.validationIssues = rebuilt.issues as unknown[];
    await this.recalculate(session);

    if (
      session.status === CHECKOUT_STATUS.OPEN &&
      session.shippingAddress &&
      session.lines.length > 0
    ) {
      session.status = CHECKOUT_STATUS.READY;
    }

    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.VALIDATED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { valid: !rebuilt.issues.some((i) => i.severity === 'error') },
    });

    const valid = !rebuilt.issues.some((i) => i.severity === 'error');
    return { ...this.toSummary(session), valid, issues: rebuilt.issues };
  }

  async reserve(
    idOrToken: string,
    user: AuthenticatedUser,
    actor: ActorMeta,
    opts?: { skipRebuild?: boolean; timeoutMinutes?: number },
  ) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);

    if (
      [CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED, CHECKOUT_STATUS.COMPLETED].includes(
        session.status as never,
      )
    ) {
      throw ApiError.badRequest(`Cannot reserve checkout in status ${session.status}`);
    }

    // Release existing first (re-reserve cleanly)
    if (session.reservationIds?.length) {
      await this.releaseReservations(session, actor, 'Re-reserve checkout');
    }

    // Re-validate lines unless caller just built them (e.g. start → autoReserve).
    if (!opts?.skipRebuild) {
      const rebuilt = await this.buildLinesFromCart(session.customerId.toString());
      const hardErrors = rebuilt.issues.filter((i) => i.severity === 'error');
      if (hardErrors.length) {
        session.validationIssues = rebuilt.issues as unknown[];
        await session.save();
        throw ApiError.unprocessable(
          'Cannot reserve — cart validation failed',
          { issues: hardErrors },
          'CHECKOUT_INVALID',
        );
      }
      session.lines = rebuilt.lines as never;
    }

    const timeout =
      opts?.timeoutMinutes ??
      (session.reservationTimeoutMinutes || CHECKOUT_RESERVATION_TTL_MINUTES);
    session.reservationTimeoutMinutes = timeout;
    const expiresAt = new Date(Date.now() + timeout * 60_000);
    const reservationIds: Types.ObjectId[] = [];

    for (const line of session.lines) {
      if (!line.warehouseId) {
        throw ApiError.unprocessable(
          `No warehouse stock for ${line.sku}`,
          { variantId: line.variantId.toString() },
          'OUT_OF_STOCK',
        );
      }

      const reservation = await reservationService.reserve(
        {
          warehouseId: line.warehouseId.toString(),
          variantId: line.variantId.toString(),
          quantity: line.quantity,
          reason: 'checkout',
          referenceType: 'checkout',
          referenceId: session._id.toString(),
          timeoutMinutes: timeout,
          expiresAt,
        },
        actor,
      );

      line.reservationId = reservation._id;
      reservationIds.push(reservation._id);
    }

    session.reservationIds = reservationIds;
    session.reservationExpiresAt = expiresAt;
    session.expiresAt = expiresAt;
    session.status = CHECKOUT_STATUS.RESERVED;
    await this.recalculate(session);
    session.status = CHECKOUT_STATUS.READY;
    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.RESERVATION_CREATED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: {
        reservationIds: reservationIds.map((id) => id.toString()),
        expiresAt,
      },
    });

    return this.toSummary(session);
  }

  async release(idOrToken: string, user: AuthenticatedUser, actor: ActorMeta) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    await this.releaseReservations(session, actor, 'Checkout release');
    session.status =
      session.shippingAddress && session.lines.length > 0
        ? CHECKOUT_STATUS.READY
        : CHECKOUT_STATUS.OPEN;
    session.reservationExpiresAt = null;
    session.expiresAt = null;
    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.RESERVATION_RELEASED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
    });

    return this.toSummary(session);
  }

  async refresh(
    idOrToken: string,
    user: AuthenticatedUser,
    payload: {
      shippingAddressId?: string;
      billingAddressId?: string;
      shippingMethod?: ShippingMethod;
      deliveryMethod?: string;
      couponCode?: string | null;
      giftCardCode?: string | null;
      extendReservation?: boolean;
    },
    actor: ActorMeta,
  ) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    await this.assertMutable(session, actor);

    if (payload.shippingAddressId) {
      session.shippingAddress = await this.loadAddressSnapshot(
        session.customerId.toString(),
        payload.shippingAddressId,
      );
    }
    if (payload.billingAddressId) {
      session.billingAddress = await this.loadAddressSnapshot(
        session.customerId.toString(),
        payload.billingAddressId,
      );
    }
    if (payload.shippingMethod) session.shippingMethod = payload.shippingMethod;
    if (payload.deliveryMethod) session.deliveryMethod = payload.deliveryMethod;

    let rebuilt = await this.buildLinesFromCart(session.customerId.toString());
    const buyNowVariantIds = Array.isArray(session.metadata?.buyNowVariantIds)
      ? (session.metadata.buyNowVariantIds as string[])
      : [];
    // Keep Buy Now scope only when metadata still has variant ids.
    // Full-bag refresh clears the filter so cart checkout shows every line.
    if (buyNowVariantIds.length) {
      rebuilt = this.filterBuiltToVariantIds(rebuilt, buyNowVariantIds);
    } else if (session.metadata && 'buyNowVariantIds' in session.metadata) {
      const nextMeta = { ...(session.metadata as Record<string, unknown>) };
      delete nextMeta.buyNowVariantIds;
      session.metadata = nextMeta;
    }
    session.lines = rebuilt.lines.map((line) => {
      const prev = session.lines.find((l) => l.variantId.toString() === line.variantId.toString());
      return { ...line, reservationId: prev?.reservationId ?? null };
    }) as never;
    session.validationIssues = rebuilt.issues as unknown[];

    await this.recalculate(session, {
      couponCode: payload.couponCode,
      giftCardCode: payload.giftCardCode,
    });

    // Promote to READY without holding stock once the customer has an address + lines.
    if (
      session.status === CHECKOUT_STATUS.OPEN &&
      session.shippingAddress &&
      session.lines.length > 0
    ) {
      session.status = CHECKOUT_STATUS.READY;
    }

    // Only extend when explicitly requested AND a payment-window hold already exists.
    if (payload.extendReservation === true && session.reservationIds?.length) {
      const timeout = session.reservationTimeoutMinutes || CHECKOUT_RESERVATION_TTL_MINUTES;
      for (const id of session.reservationIds) {
        try {
          await reservationService.extend(id.toString(), actor, timeout);
        } catch {
          // ignore individual extend failures; expire check handles them
        }
      }
      const expiresAt = new Date(Date.now() + timeout * 60_000);
      session.reservationExpiresAt = expiresAt;
      session.expiresAt = expiresAt;
    }

    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.REFRESHED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
    });

    return this.toSummary(session);
  }

  async cancel(idOrToken: string, user: AuthenticatedUser, actor: ActorMeta) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);

    if (session.status === CHECKOUT_STATUS.CANCELLED) {
      return this.toSummary(session);
    }

    await this.releaseReservations(session, actor, 'Checkout cancelled');
    session.status = CHECKOUT_STATUS.CANCELLED;
    session.reservationExpiresAt = null;
    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.CANCELLED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
    });

    return this.toSummary(session);
  }

  /**
   * Hold stock for the payment window (Place Order). Idempotent when an active
   * hold already exists — extends TTL instead of double-reserving.
   */
  async ensureReservedForPayment(
    idOrToken: string,
    user: AuthenticatedUser,
    actor: ActorMeta,
    timeoutMinutes: number = CHECKOUT_RESERVATION_TTL_MINUTES,
  ) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);

    if (
      [CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED, CHECKOUT_STATUS.COMPLETED].includes(
        session.status as never,
      )
    ) {
      throw ApiError.badRequest(`Cannot reserve checkout in status ${session.status}`);
    }

    const hasActiveHold =
      Boolean(session.reservationIds?.length) &&
      Boolean(session.reservationExpiresAt) &&
      session.reservationExpiresAt! > new Date();

    if (hasActiveHold) {
      let extendFailed = false;
      for (const id of session.reservationIds) {
        try {
          await reservationService.extend(id.toString(), actor, timeoutMinutes);
        } catch {
          extendFailed = true;
          break;
        }
      }
      if (!extendFailed) {
        const expiresAt = new Date(Date.now() + timeoutMinutes * 60_000);
        session.reservationTimeoutMinutes = timeoutMinutes;
        session.reservationExpiresAt = expiresAt;
        session.expiresAt = expiresAt;
        session.status = CHECKOUT_STATUS.READY;
        await session.save();
        return this.toSummary(session);
      }
    }

    return this.reserve(session._id.toString(), user, actor, { timeoutMinutes });
  }

  /**
   * System-level release used when a payment fails/cancels (no customer JWT).
   * Restores available inventory and returns the session to READY without a hold.
   */
  async releaseForPaymentFailure(checkoutId: string, note = 'Payment failed — release hold') {
    const session = await CheckoutSessionModel.findById(checkoutId);
    if (!session) return null;
    if (
      [CHECKOUT_STATUS.COMPLETED, CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED].includes(
        session.status as never,
      )
    ) {
      return this.toSummary(session);
    }

    await this.releaseReservations(session, {}, note);
    session.status = CHECKOUT_STATUS.READY;
    session.reservationExpiresAt = null;
    session.expiresAt = null;
    await session.save();

    await writeAuditLog({
      action: CHECKOUT_AUDIT.RESERVATION_RELEASED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      metadata: { reason: note },
    });

    return this.toSummary(session);
  }

  /**
   * Release payment-window holds whose TTL elapsed. Checkout stays READY so the
   * customer can Place Order again (stock is no longer locked).
   */
  async expireDueSessions(actor: ActorMeta = {}) {
    const due = await CheckoutSessionModel.find({
      status: { $in: [CHECKOUT_STATUS.RESERVED, CHECKOUT_STATUS.READY] },
      reservationExpiresAt: { $lte: new Date() },
      reservationIds: { $exists: true, $not: { $size: 0 } },
    }).limit(100);

    let released = 0;
    for (const session of due) {
      try {
        await this.releaseReservations(session, actor, 'Checkout reservation TTL expired');
        session.status = CHECKOUT_STATUS.READY;
        session.reservationExpiresAt = null;
        await session.save();
        await writeAuditLog({
          action: CHECKOUT_AUDIT.RESERVATION_EXPIRED,
          resourceType: 'checkout_sessions',
          resourceId: session._id.toString(),
          actorUserId: actor.userId,
          ip: actor.ip,
          requestId: actor.requestId,
        });
        released += 1;
      } catch {
        // continue
      }
    }
    return { scanned: due.length, released };
  }

  private async releaseReservations(
    session: CheckoutSessionDocument,
    actor: ActorMeta,
    note: string,
  ) {
    for (const id of session.reservationIds ?? []) {
      try {
        await reservationService.release(id.toString(), actor, note);
      } catch {
        // already released/expired
      }
    }
    for (const line of session.lines) {
      line.reservationId = null;
    }
    session.reservationIds = [];
  }

  private async expireSession(session: CheckoutSessionDocument, actor: ActorMeta) {
    await this.releaseReservations(session, actor, 'Checkout expired');
    session.status = CHECKOUT_STATUS.EXPIRED;
    await session.save();
    await writeAuditLog({
      action: CHECKOUT_AUDIT.RESERVATION_EXPIRED,
      resourceType: 'checkout_sessions',
      resourceId: session._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
    });
  }

  private async assertMutable(session: CheckoutSessionDocument, actor: ActorMeta) {
    if (
      [CHECKOUT_STATUS.COMPLETED, CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED].includes(
        session.status as never,
      )
    ) {
      throw ApiError.badRequest(
        `Checkout is ${session.status} and can no longer be modified`,
        { checkoutId: session._id.toString(), status: session.status },
        'CHECKOUT_CLOSED',
      );
    }

    await this.ensureReservationNotExpired(session, actor);
  }

  private async ensureReservationNotExpired(session: CheckoutSessionDocument, actor: ActorMeta) {
    if (
      session.reservationExpiresAt &&
      session.reservationExpiresAt <= new Date() &&
      session.reservationIds?.length &&
      [CHECKOUT_STATUS.RESERVED, CHECKOUT_STATUS.READY].includes(session.status as never)
    ) {
      // Soft-release the payment hold; keep checkout usable for a new Place Order.
      await this.releaseReservations(session, actor, 'Checkout reservation TTL expired');
      session.status = CHECKOUT_STATUS.READY;
      session.reservationExpiresAt = null;
      session.expiresAt = null;
      await session.save();
      await writeAuditLog({
        action: CHECKOUT_AUDIT.RESERVATION_EXPIRED,
        resourceType: 'checkout_sessions',
        resourceId: session._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
      });
    }
  }

  toSummary(session: CheckoutSessionDocument) {
    return {
      id: session._id.toString(),
      checkoutToken: session.checkoutToken,
      status: session.status,
      customerId: session.customerId.toString(),
      cartId: session.cartId.toString(),
      currency: session.currency,
      lines: session.lines,
      shippingAddress: session.shippingAddress,
      billingAddress: session.billingAddress,
      shippingMethod: session.shippingMethod,
      deliveryMethod: session.deliveryMethod,
      shippingEstimate: session.shippingEstimate,
      taxEstimate: session.taxEstimate,
      coupon: session.coupon,
      giftCard: session.giftCard,
      totals: session.totals,
      reservationIds: session.reservationIds.map((id) => id.toString()),
      reservationExpiresAt: session.reservationExpiresAt,
      expiresAt: session.expiresAt,
      validationIssues: session.validationIssues,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      summary: {
        itemCount: session.lines.length,
        totalQuantity: session.totals.totalQuantity,
        subtotal: session.totals.subtotal,
        shipping: session.totals.shipping,
        tax: session.totals.tax,
        discount: session.totals.discount,
        grandTotal: session.totals.grandTotal,
        currency: session.currency,
        // Ready when addresses + lines exist. Stock hold happens later at Place Order.
        readyForPayment:
          [CHECKOUT_STATUS.OPEN, CHECKOUT_STATUS.READY, CHECKOUT_STATUS.RESERVED].includes(
            session.status as never,
          ) &&
          Boolean(session.shippingAddress) &&
          session.lines.length > 0,
        payment: {
          status: 'not_started',
          message: 'Payments are handled in a future phase',
        },
        orders: {
          status: 'not_started',
          message: 'Orders are handled in a future phase',
        },
      },
    };
  }

  async adminGet(idOrToken: string) {
    const session = await this.getByIdOrToken(idOrToken);
    return this.toSummary(session);
  }
}

export const checkoutService = new CheckoutService();
