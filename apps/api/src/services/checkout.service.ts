import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { CheckoutSessionModel, type CheckoutSessionDocument } from '@/models/checkout.models';
import { InventoryItemModel, WarehouseModel } from '@/models/inventory.models';
import { CustomerAddressModel } from '@/models/customer.models';
import { cartService } from '@/services/cart.service';
import { reservationService } from '@/services/reservation.service';
import { customerService } from '@/services/customer.service';
import {
  applyCouponPlaceholder,
  applyGiftCardPlaceholder,
  calculateShipping,
  calculateTax,
} from '@/services/checkout-calculators';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import {
  CHECKOUT_AUDIT,
  CHECKOUT_RESERVATION_TTL_MINUTES,
  CHECKOUT_STATUS,
  DELIVERY_METHOD,
  SHIPPING_METHOD,
  type ShippingMethod,
} from '@/constants/checkout';
import type { AuthenticatedUser } from '@/types';

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function newCheckoutToken() {
  return `chk_${randomBytes(24).toString('hex')}`;
}

async function pickWarehouseForVariant(variantId: string, quantity: number) {
  const items = await InventoryItemModel.find({
    variantId,
    isDeleted: false,
    available: { $gte: quantity },
  })
    .sort({ available: -1 })
    .limit(5);

  if (!items.length) {
    // prefer any warehouse with some stock for clearer error later
    const any = await InventoryItemModel.find({
      variantId,
      isDeleted: false,
    })
      .sort({ available: -1 })
      .limit(1);
    return any[0] ?? null;
  }

  // Prefer default warehouse when available and sufficient
  const defaultWh = await WarehouseModel.findOne({
    isDefault: true,
    isDeleted: false,
    status: 'active',
  });
  if (defaultWh) {
    const atDefault = items.find((i) => i.warehouseId.toString() === defaultWh._id.toString());
    if (atDefault) return atDefault;
  }

  return items[0]!;
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

    const cartValidation = await cartService.validateCart(String(view.cart._id));
    const issues = cartValidation.issues;

    const lines = [];
    for (const raw of view.items) {
      const item = raw as {
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
      };

      const inv = await pickWarehouseForVariant(item.variantId.toString(), item.quantity);

      lines.push({
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
        weightGrams: item.weightGrams ?? 0,
        taxClass: null,
        warehouseId: inv?.warehouseId ?? null,
        reservationId: null,
      });

      if (item.priceChanged) {
        issues.push({
          code: 'PRICE_CHANGED',
          message: `Price changed for ${item.sku}`,
          variantId: item.variantId.toString(),
          severity: 'warning' as const,
        });
      }
    }

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

    const shippingEstimate = await calculateShipping({
      country: shippingAddress?.country,
      state: shippingAddress?.state,
      subtotal,
      totalWeightGrams,
      method: session.shippingMethod as ShippingMethod,
      currency: session.currency,
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
    },
    actor: ActorMeta,
  ) {
    const customer = await customerService.ensureForUser(user, actor);

    const existing = await CheckoutSessionModel.findOne({
      customerId: customer._id,
      status: { $in: [CHECKOUT_STATUS.OPEN, CHECKOUT_STATUS.RESERVED, CHECKOUT_STATUS.READY] },
      isDeleted: false,
    });

    if (existing) {
      // Reject duplicate unless expired
      if (existing.reservationExpiresAt && existing.reservationExpiresAt <= new Date()) {
        await this.expireSession(existing, actor);
      } else {
        throw ApiError.conflict(
          'Active checkout session already exists',
          { checkoutId: existing._id.toString(), checkoutToken: existing.checkoutToken },
          'DUPLICATE_CHECKOUT',
        );
      }
    }

    const built = await this.buildLinesFromCart(customer._id.toString());
    const hardErrors = built.issues.filter((i) => i.severity === 'error');
    if (hardErrors.length) {
      throw ApiError.unprocessable(
        'Checkout validation failed',
        { issues: hardErrors },
        'CHECKOUT_INVALID',
      );
    }

    const shippingAddressId =
      payload.shippingAddressId ??
      (await customerService.getById(customer._id.toString())).defaultShippingAddressId?.toString();
    const billingAddressId =
      payload.billingAddressId ??
      (
        await customerService.getById(customer._id.toString())
      ).defaultBillingAddressId?.toString() ??
      shippingAddressId;

    const shippingAddress = await this.loadAddressSnapshot(
      customer._id.toString(),
      shippingAddressId,
    );
    const billingAddress = await this.loadAddressSnapshot(
      customer._id.toString(),
      billingAddressId,
    );

    const timeout = CHECKOUT_RESERVATION_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + timeout * 60_000);

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
      expiresAt,
      validationIssues: built.issues,
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

    if (payload.autoReserve !== false) {
      return this.reserve(session._id.toString(), user, actor);
    }

    return this.toSummary(session);
  }

  async get(idOrToken: string, user: AuthenticatedUser) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    await this.ensureNotExpired(session, { userId: user.id });
    return this.toSummary(session);
  }

  async validate(idOrToken: string, user: AuthenticatedUser, actor: ActorMeta) {
    const session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    await this.ensureNotExpired(session, actor);

    const rebuilt = await this.buildLinesFromCart(session.customerId.toString());
    session.lines = rebuilt.lines as never;
    session.validationIssues = rebuilt.issues as unknown[];
    await this.recalculate(session);
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

  async reserve(idOrToken: string, user: AuthenticatedUser, actor: ActorMeta) {
    let session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);

    if ([CHECKOUT_STATUS.CANCELLED, CHECKOUT_STATUS.EXPIRED].includes(session.status as never)) {
      throw ApiError.badRequest(`Cannot reserve checkout in status ${session.status}`);
    }

    // Release existing first (re-reserve cleanly)
    if (session.reservationIds?.length) {
      await this.releaseReservations(session, actor, 'Re-reserve checkout');
    }

    // Re-validate lines
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
    const timeout = session.reservationTimeoutMinutes || CHECKOUT_RESERVATION_TTL_MINUTES;
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
    session.status = CHECKOUT_STATUS.OPEN;
    session.reservationExpiresAt = null;
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
    let session = await this.getByIdOrToken(idOrToken);
    await this.assertOwner(session, user);
    await this.ensureNotExpired(session, actor);

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

    const rebuilt = await this.buildLinesFromCart(session.customerId.toString());
    session.lines = rebuilt.lines.map((line) => {
      const prev = session.lines.find((l) => l.variantId.toString() === line.variantId.toString());
      return { ...line, reservationId: prev?.reservationId ?? null };
    }) as never;
    session.validationIssues = rebuilt.issues as unknown[];

    await this.recalculate(session, {
      couponCode: payload.couponCode,
      giftCardCode: payload.giftCardCode,
    });

    if (payload.extendReservation !== false && session.reservationIds?.length) {
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

  private async ensureNotExpired(session: CheckoutSessionDocument, actor: ActorMeta) {
    if (
      session.reservationExpiresAt &&
      session.reservationExpiresAt <= new Date() &&
      [CHECKOUT_STATUS.RESERVED, CHECKOUT_STATUS.READY].includes(session.status as never)
    ) {
      await this.expireSession(session, actor);
      throw ApiError.badRequest(
        'Checkout reservation expired',
        { checkoutId: session._id.toString() },
        'RESERVATION_EXPIRED',
      );
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
        readyForPayment: session.status === CHECKOUT_STATUS.READY,
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
