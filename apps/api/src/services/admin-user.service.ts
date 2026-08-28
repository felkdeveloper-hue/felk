import { type Types } from 'mongoose';
import { z } from 'zod';
import { AUDIT_ACTIONS, AUTH_LIMITS, USER_STATUS, type UserStatus } from '@/constants/auth.js';
import { CART_STATUS, CART_ITEM_LOCATION } from '@/constants/cart.js';
import { ORDER_STATUS } from '@/constants/order-status.js';
import { ROLES, type RoleKey } from '@/constants/roles.js';
import {
  CartItemModel,
  CartModel,
  CustomerModel,
  OrderModel,
  PasswordResetTokenModel,
  PaymentModel,
  RefreshTokenModel,
  UserModel,
  UserSessionModel,
  VerificationTokenModel,
} from '@/models/index.js';
import { paginationQuerySchema, objectIdSchema } from '@/schemas/common.schema.js';
import { findRoleByKey } from '@/services/rbac.service.js';
import { writeAuditLog } from '@/services/audit.service.js';
import { VisitorModel } from '@/models/analytics/index.js';
import {
  formatAttribution,
  hasAttributionSignal,
} from '@/services/platform-analytics/source-attribution.util.js';
import { ApiError } from '@/utils/errors/api-error.js';
import {
  assertPasswordStrength,
  hashPassword,
  pushPasswordHistory,
} from '@/utils/password.helper.js';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination.js';
import { parseSort } from '@/utils/sorting.js';
import { orderReceivedAt, paymentReceivedAt } from '@/utils/order-received-at.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  roleKey: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminUserIdParamsSchema = z.object({
  userId: objectIdSchema,
});

export const adminSetPasswordSchema = z.object({
  password: passwordSchema,
});

const assignableRoleKeySchema = z.enum([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.SUB_ADMIN,
  ROLES.MANAGER,
  ROLES.INVENTORY_MANAGER,
  ROLES.MARKETING_MANAGER,
  ROLES.CUSTOMER_SUPPORT,
  ROLES.FINANCE,
  ROLES.WAREHOUSE_STAFF,
  ROLES.CUSTOMER,
]);

export const adminUpdateUserSchema = z.object({
  status: z
    .enum([
      USER_STATUS.ACTIVE,
      USER_STATUS.LOCKED,
      USER_STATUS.SUSPENDED,
      USER_STATUS.PENDING_VERIFICATION,
      USER_STATUS.INVITED,
    ])
    .optional(),
  roleKey: assignableRoleKeySchema.optional(),
});

export const adminCreateUserSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional().default(''),
  phone: z.string().trim().max(40).optional(),
  roleKey: assignableRoleKeySchema.default(ROLES.CUSTOMER),
  status: z
    .enum([USER_STATUS.ACTIVE, USER_STATUS.PENDING_VERIFICATION, USER_STATUS.INVITED])
    .optional()
    .default(USER_STATUS.ACTIVE),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

/** Roles only a super_admin may assign. */
const PRIVILEGED_ROLES: RoleKey[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

async function assertCanAssignRole(actorUserId: string, roleKey: RoleKey) {
  if (!PRIVILEGED_ROLES.includes(roleKey)) return;
  const actor = await UserModel.findOne({ _id: actorUserId, isDeleted: false })
    .select('roleKey')
    .lean();
  if (!actor || actor.roleKey !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden(
      'Only a super admin can assign Admin or Super admin roles',
      'ROLE_ASSIGN_FORBIDDEN',
    );
  }
}

export interface AdminActorMeta {
  userId: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

function mapUserRow(
  user: {
    _id: Types.ObjectId;
    email: string;
    firstName: string;
    lastName: string;
    roleKey: string;
    status: string;
    passwordHash?: string | null;
    googleId?: string | null;
    lastLoginAt?: Date | null;
    lastLoginCountry?: string | null;
    lastLoginDevice?: string | null;
    metadata?: Record<string, unknown> | null;
    sourceLabel?: string | null;
    sourceChannel?: string | null;
    sourceDetail?: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  extras: {
    customerId?: string;
    cartItemCount: number;
    purchasedItemCount: number;
    sourceLabel?: string | null;
    sourceChannel?: string | null;
    sourceDetail?: string | null;
    lastLoginCountry?: string | null;
    lastLoginDevice?: string | null;
  },
) {
  const hasPassword = Boolean(user.passwordHash);
  const firstName = user.firstName?.trim() ?? '';
  const lastName = user.lastName?.trim() ?? '';
  // Legacy single-name signups stored the same value twice — expose once for the admin UI.
  const normalizedLast =
    lastName && lastName.toLowerCase() !== firstName.toLowerCase() ? lastName : '';
  return {
    id: String(user._id),
    email: user.email,
    firstName,
    lastName: normalizedLast,
    roleKey: user.roleKey,
    status: user.status,
    hasPassword,
    passwordDisplay: hasPassword ? '••••••••' : '—',
    authProvider: user.googleId ? 'google' : 'password',
    customerId: extras.customerId,
    cartItemCount: extras.cartItemCount,
    purchasedItemCount: extras.purchasedItemCount,
    lastLoginAt: user.lastLoginAt ?? null,
    lastLoginCountry: extras.lastLoginCountry || user.lastLoginCountry || null,
    lastLoginDevice: extras.lastLoginDevice || user.lastLoginDevice || null,
    sourceLabel: extras.sourceLabel ?? null,
    sourceChannel: extras.sourceChannel ?? null,
    sourceDetail: extras.sourceDetail ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function revokeUserSessions(userId: Types.ObjectId) {
  await UserSessionModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: 'admin_action' } },
  );
  await RefreshTokenModel.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

function visitExtras(
  visitor:
    | {
        geo?: {
          city?: string | null;
          region?: string | null;
          country?: string | null;
          countryCode?: string | null;
        } | null;
        device?: { type?: string | null } | null;
        trafficSource?: string | null;
        referrer?: string | null;
        utmSource?: string | null;
        utmMedium?: string | null;
        utmCampaign?: string | null;
        utmContent?: string | null;
        fbclid?: string | null;
        gclid?: string | null;
        ttclid?: string | null;
        msclkid?: string | null;
        igshid?: string | null;
        inAppSource?: string | null;
      }
    | null
    | undefined,
  acquisition?: {
    sourceLabel?: string | null;
    sourceChannel?: string | null;
    sourceDetail?: string | null;
  } | null,
) {
  if (!visitor && !acquisition?.sourceLabel) {
    return {
      sourceLabel: null as string | null,
      sourceChannel: null as string | null,
      sourceDetail: null as string | null,
      lastLoginCountry: null as string | null,
      lastLoginDevice: null as string | null,
    };
  }

  const attribution = visitor
    ? formatAttribution({
        trafficSource: visitor.trafficSource || 'direct',
        referrer: visitor.referrer,
        utmSource: visitor.utmSource,
        utmMedium: visitor.utmMedium,
        utmCampaign: visitor.utmCampaign,
        utmContent: visitor.utmContent,
        fbclid: visitor.fbclid,
        gclid: visitor.gclid,
        ttclid: visitor.ttclid,
        msclkid: visitor.msclkid,
        igshid: visitor.igshid,
        inAppSource: visitor.inAppSource,
      })
    : null;

  const visitorHasSignal = visitor
    ? hasAttributionSignal({
        referrer: visitor.referrer,
        utmSource: visitor.utmSource,
        utmMedium: visitor.utmMedium,
        utmCampaign: visitor.utmCampaign,
        utmContent: visitor.utmContent,
        fbclid: visitor.fbclid,
        gclid: visitor.gclid,
        ttclid: visitor.ttclid,
        msclkid: visitor.msclkid,
        igshid: visitor.igshid,
        inAppSource: visitor.inAppSource,
      })
    : false;

  const device =
    visitor?.device?.type === 'mobile'
      ? 'Phone'
      : visitor?.device?.type === 'tablet'
        ? 'Tablet'
        : visitor?.device?.type === 'desktop'
          ? 'Desktop'
          : null;

  const countryParts = [
    visitor?.geo?.city,
    visitor?.geo?.region,
    visitor?.geo?.country ?? visitor?.geo?.countryCode,
  ].filter((part) => Boolean(part && String(part).trim()));

  return {
    sourceLabel: visitorHasSignal
      ? (attribution?.label ?? null)
      : (acquisition?.sourceLabel ?? attribution?.label ?? null),
    sourceChannel: visitorHasSignal
      ? (attribution?.channel ?? null)
      : (acquisition?.sourceChannel ?? attribution?.channel ?? null),
    sourceDetail: visitorHasSignal
      ? (attribution?.detail ?? null)
      : (acquisition?.sourceDetail ?? attribution?.detail ?? null),
    lastLoginCountry: countryParts.join(', ') || null,
    lastLoginDevice: device,
  };
}

export class AdminUserService {
  async list(options: AdminUserListQuery) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { isDeleted: false };

    if (options.roleKey) filter.roleKey = options.roleKey;
    if (options.status) filter.status = options.status;

    if (options.q) {
      const escaped = options.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
    }

    const sortable = [
      'createdAt',
      'updatedAt',
      'email',
      'firstName',
      'lastName',
      'roleKey',
      'status',
    ];
    const sort = parseSort(options, sortable);
    const skip = getPaginationSkip(page, limit);

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('+passwordHash +googleId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    const userIds = users.map((user) => user._id);
    const customers = await CustomerModel.find({
      userId: { $in: userIds },
      isDeleted: false,
    })
      .select('_id userId')
      .lean();

    const customerByUserId = new Map<string, Types.ObjectId>();
    for (const customer of customers) {
      if (customer.userId) {
        customerByUserId.set(String(customer.userId), customer._id as Types.ObjectId);
      }
    }
    const customerIds = [...customerByUserId.values()];

    const cartCountByCustomer = new Map<string, number>();
    const purchaseCountByCustomer = new Map<string, number>();

    if (customerIds.length > 0) {
      const carts = await CartModel.find({
        customerId: { $in: customerIds },
        status: CART_STATUS.ACTIVE,
        isDeleted: false,
      })
        .select('_id customerId')
        .lean();

      const cartIds = carts.map((cart) => cart._id);
      if (cartIds.length > 0) {
        const cartAgg = await CartItemModel.aggregate<{ _id: Types.ObjectId; total: number }>([
          {
            $match: {
              cartId: { $in: cartIds },
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: '$customerId',
              total: { $sum: '$quantity' },
            },
          },
        ]);
        for (const row of cartAgg) {
          if (row._id) cartCountByCustomer.set(String(row._id), row.total);
        }
      }

      const orderAgg = await OrderModel.aggregate<{ _id: Types.ObjectId; total: number }>([
        {
          $match: {
            customerId: { $in: customerIds },
            isDeleted: false,
            status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED] },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$customerId',
            total: { $sum: '$items.quantity' },
          },
        },
      ]);
      for (const row of orderAgg) {
        if (row._id) purchaseCountByCustomer.set(String(row._id), row.total);
      }
    }

    const visitors = userIds.length
      ? await VisitorModel.find({ userId: { $in: userIds } })
          .sort({ lastSeenAt: -1 })
          .select(
            'userId geo device trafficSource referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource',
          )
          .lean()
      : [];
    const visitorByUser = new Map<string, (typeof visitors)[number]>();
    for (const visitor of visitors) {
      if (!visitor.userId) continue;
      const id = String(visitor.userId);
      if (!visitorByUser.has(id)) visitorByUser.set(id, visitor);
    }

    const data = users.map((user) => {
      const customerId = customerByUserId.get(String(user._id));
      const customerIdStr = customerId ? String(customerId) : undefined;
      const visit = visitorByUser.get(String(user._id));
      const acquisition =
        user.metadata &&
        typeof user.metadata === 'object' &&
        'acquisition' in user.metadata &&
        user.metadata.acquisition &&
        typeof user.metadata.acquisition === 'object'
          ? (user.metadata.acquisition as {
              sourceLabel?: string | null;
              sourceChannel?: string | null;
              sourceDetail?: string | null;
            })
          : null;

      return mapUserRow(user, {
        customerId: customerIdStr,
        cartItemCount: customerIdStr ? (cartCountByCustomer.get(customerIdStr) ?? 0) : 0,
        purchasedItemCount: customerIdStr ? (purchaseCountByCustomer.get(customerIdStr) ?? 0) : 0,
        ...visitExtras(visit, acquisition),
      });
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(userId: string) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false })
      .select('+passwordHash +googleId')
      .lean();
    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const [customer, visitor] = await Promise.all([
      CustomerModel.findOne({ userId: user._id, isDeleted: false }).lean(),
      VisitorModel.findOne({ userId: user._id })
        .sort({ lastSeenAt: -1 })
        .select(
          'geo device trafficSource referrer utmSource utmMedium utmCampaign utmContent fbclid gclid ttclid msclkid igshid inAppSource',
        )
        .lean(),
    ]);
    const customerIdStr = customer ? String(customer._id) : undefined;

    let cartItems: Array<{
      id: string;
      title: string;
      quantity: number;
      currentPrice: number;
      currency: string;
      colorName?: string | null;
      sizeName?: string | null;
      thumbnailUrl?: string | null;
      updatedAt?: Date;
    }> = [];

    let orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      grandTotal: number;
      currency: string;
      itemCount: number;
      paymentId?: string;
      paidAt?: Date;
      placedAt?: Date;
      createdAt?: Date;
    }> = [];

    if (customer) {
      const cart = await CartModel.findOne({
        customerId: customer._id,
        status: CART_STATUS.ACTIVE,
        isDeleted: false,
      }).lean();

      if (cart) {
        const items = await CartItemModel.find({
          cartId: cart._id,
          location: CART_ITEM_LOCATION.CART,
          isDeleted: false,
        })
          .sort({ updatedAt: -1 })
          .lean();

        cartItems = items.map((item) => ({
          id: String(item._id),
          title: item.title,
          quantity: item.quantity,
          currentPrice: item.currentPrice,
          currency: item.currency,
          colorName: item.colorName,
          sizeName: item.sizeName,
          thumbnailUrl: item.thumbnailUrl,
          updatedAt: item.updatedAt,
        }));
      }

      const orderDocs = await OrderModel.find({
        customerId: customer._id,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      orders = orderDocs.map((order) => {
        const totals = (order.totals ?? {}) as {
          grandTotal?: number;
          currency?: string;
          totalQuantity?: number;
        };
        const items = Array.isArray(order.items) ? order.items : [];
        return {
          id: String(order._id),
          orderNumber: order.orderNumber,
          status: order.status,
          grandTotal: Number(totals.grandTotal ?? 0),
          currency: String(totals.currency ?? order.currency ?? 'LKR'),
          itemCount: Number(totals.totalQuantity ?? items.length),
          paymentId: String(order.paymentId ?? ''),
          paidAt: order.paidAt ?? undefined,
          placedAt: order.placedAt ?? undefined,
          createdAt: order.createdAt,
        };
      });

      const paymentIds = [...new Set(orders.map((row) => row.paymentId).filter(Boolean))];
      if (paymentIds.length) {
        const payments = await PaymentModel.find({ _id: { $in: paymentIds } })
          .select('paidAt createdAt gatewayPaymentId metadata referenceNumber')
          .lean();
        const byId = new Map(payments.map((payment) => [String(payment._id), payment]));
        orders = orders.map((row) => {
          const paymentId = row.paymentId ?? '';
          const received = paymentReceivedAt(byId.get(paymentId) ?? {}) ?? orderReceivedAt(row);
          return received
            ? { ...row, paidAt: received, placedAt: received, createdAt: row.createdAt }
            : row;
        });
      }
    }

    const purchasedItemCount = orders.reduce((sum, order) => sum + order.itemCount, 0);
    const acquisition =
      user.metadata &&
      typeof user.metadata === 'object' &&
      'acquisition' in user.metadata &&
      user.metadata.acquisition &&
      typeof user.metadata.acquisition === 'object'
        ? (user.metadata.acquisition as {
            sourceLabel?: string | null;
            sourceChannel?: string | null;
            sourceDetail?: string | null;
          })
        : null;

    return {
      ...mapUserRow(user, {
        customerId: customerIdStr,
        cartItemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        purchasedItemCount,
        ...visitExtras(visitor, acquisition),
      }),
      cartItems,
      orders,
    };
  }

  private async getActiveUser(userId: string) {
    const user = await UserModel.findOne({ _id: userId, isDeleted: false }).select(
      '+passwordHash +passwordHistory +googleId',
    );
    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }
    return user;
  }

  async setPassword(userId: string, password: string, actor: AdminActorMeta) {
    assertPasswordStrength(password);
    const user = await this.getActiveUser(userId);

    const newHash = await hashPassword(password);
    user.passwordHistory = pushPasswordHistory(
      user.passwordHash,
      user.passwordHistory ?? [],
      AUTH_LIMITS.PASSWORD_HISTORY_SIZE,
    );
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.status === USER_STATUS.LOCKED) {
      user.status = USER_STATUS.ACTIVE;
    }
    await user.save();

    await PasswordResetTokenModel.updateMany(
      { userId: user._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );
    await revokeUserSessions(user._id);

    await writeAuditLog({
      action: AUDIT_ACTIONS.ADMIN_PASSWORD_SET,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { targetEmail: user.email },
    });

    return { message: 'Password updated', userId: user._id.toString() };
  }

  async create(input: AdminCreateUserInput, actor: AdminActorMeta) {
    await assertCanAssignRole(actor.userId, input.roleKey);

    const existing = await UserModel.findOne({ email: input.email, isDeleted: false }).lean();
    if (existing) {
      throw ApiError.conflict('A user with this email already exists', undefined, 'EMAIL_TAKEN');
    }

    let role = await findRoleByKey(input.roleKey);
    if (!role) {
      // Auto-upsert from ROLE_SEED so new roles (e.g. sub_admin) work without a manual seed.
      const { ROLE_SEED } = await import('@/constants/rbac-seed.js');
      const { PermissionModel, RoleModel } = await import('@/models/index.js');
      const seed = ROLE_SEED.find((r) => r.key === input.roleKey);
      if (!seed) {
        throw ApiError.badRequest(
          `Role "${input.roleKey}" is not seeded. Run seed:auth first.`,
          undefined,
          'ROLE_MISSING',
        );
      }
      const permissionDocs = await PermissionModel.find({
        key: { $in: seed.permissions },
      }).select('_id');
      await RoleModel.updateOne(
        { key: seed.key },
        {
          $set: {
            key: seed.key,
            name: seed.name,
            description: seed.description,
            permissionIds: permissionDocs.map((p) => p._id),
            isSystem: true,
            status: 'active',
            isDeleted: false,
            deletedAt: null,
          },
        },
        { upsert: true },
      );
      role = await findRoleByKey(input.roleKey);
      if (!role) {
        throw ApiError.badRequest('Role not found after seed', undefined, 'ROLE_MISSING');
      }
    }

    assertPasswordStrength(input.password);
    const passwordHash = await hashPassword(input.password);
    const status = input.status ?? USER_STATUS.ACTIVE;

    const firstName = input.firstName.trim();
    const lastName = (input.lastName ?? '').trim() || '-';

    const user = await UserModel.create({
      email: input.email,
      passwordHash,
      passwordHistory: [],
      firstName,
      lastName,
      phone: input.phone?.trim() || null,
      roleId: role._id,
      roleKey: input.roleKey,
      status,
      emailVerifiedAt: status === USER_STATUS.ACTIVE ? new Date() : null,
    });

    if (input.roleKey === ROLES.CUSTOMER) {
      const { customerService } = await import('@/services/customer.service.js');
      await customerService.ensureForUser({
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      });
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: {
        email: user.email,
        roleKey: user.roleKey,
        createdByAdmin: true,
      },
    });

    return mapUserRow(user.toObject(), {
      cartItemCount: 0,
      purchasedItemCount: 0,
    });
  }

  async update(
    userId: string,
    input: { status?: UserStatus; roleKey?: RoleKey },
    actor: AdminActorMeta,
  ) {
    if (!input.status && !input.roleKey) {
      throw ApiError.badRequest('Nothing to update', undefined, 'NO_CHANGES');
    }

    if (actor.userId === userId && input.status && input.status !== USER_STATUS.ACTIVE) {
      throw ApiError.badRequest(
        'You cannot lock or suspend your own account',
        undefined,
        'SELF_LOCK',
      );
    }

    const user = await this.getActiveUser(userId);
    const before = {
      status: user.status,
      roleKey: user.roleKey,
    };

    if (input.roleKey && input.roleKey !== user.roleKey) {
      await assertCanAssignRole(actor.userId, input.roleKey);
      const role = await findRoleByKey(input.roleKey);
      if (!role) {
        throw ApiError.badRequest('Role not found', undefined, 'ROLE_MISSING');
      }
      user.roleId = role._id;
      user.roleKey = input.roleKey;
    }

    if (input.status && input.status !== user.status) {
      user.status = input.status;
      if (input.status === USER_STATUS.LOCKED) {
        user.lockedUntil = new Date(Date.now() + AUTH_LIMITS.LOCK_DURATION_MINUTES * 60_000);
      }
      if (input.status === USER_STATUS.ACTIVE) {
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
      }
      if (input.status === USER_STATUS.LOCKED || input.status === USER_STATUS.SUSPENDED) {
        await revokeUserSessions(user._id);
      }
    }

    await user.save();

    if (before.roleKey !== user.roleKey) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        resourceType: 'user',
        resourceId: user._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        before: { roleKey: before.roleKey },
        after: { roleKey: user.roleKey },
      });
    }

    if (before.status !== user.status) {
      await writeAuditLog({
        action:
          user.status === USER_STATUS.LOCKED
            ? AUDIT_ACTIONS.ACCOUNT_LOCKED
            : AUDIT_ACTIONS.USER_STATUS_CHANGED,
        resourceType: 'user',
        resourceId: user._id.toString(),
        actorUserId: actor.userId,
        ip: actor.ip,
        requestId: actor.requestId,
        before: { status: before.status },
        after: { status: user.status },
      });
    }

    return mapUserRow(user.toObject(), {
      cartItemCount: 0,
      purchasedItemCount: 0,
    });
  }

  async softDelete(userId: string, actor: AdminActorMeta) {
    if (actor.userId === userId) {
      throw ApiError.badRequest('You cannot delete your own account', undefined, 'SELF_DELETE');
    }

    const user = await this.getActiveUser(userId);

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.status = USER_STATUS.SUSPENDED;
    await user.save();

    await revokeUserSessions(user._id);
    await VerificationTokenModel.updateMany(
      { userId: user._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );
    await PasswordResetTokenModel.updateMany(
      { userId: user._id, consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_DELETED,
      resourceType: 'user',
      resourceId: user._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { email: user.email, roleKey: user.roleKey },
    });

    return { message: 'User deleted', userId: user._id.toString() };
  }
}

export const adminUserService = new AdminUserService();
