import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import { CustomerModel, LoyaltyTierModel, type CustomerDocument } from '@/models/customer.models';
import { UserModel } from '@/models/user.model';
import { writeAuditLog, writeActivityLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { parseSort } from '@/utils/sorting';
import { CUSTOMER_AUDIT, CUSTOMER_STATUS, LOYALTY_TIER } from '@/constants/customer';
import type { AuthenticatedUser } from '@/types';

function toPlain(doc: { toObject: () => Record<string, unknown> }) {
  return doc.toObject();
}

function generateReferralCode(seed?: string) {
  const base = (seed ?? randomBytes(4).toString('hex')).replace(/[^a-zA-Z0-9]/g, '');
  // Always append entropy so concurrent registers with similar email prefixes
  // (e.g. customer_*) cannot race on the same referralCode.
  const entropy = randomBytes(3).toString('hex').toUpperCase();
  return `FE-${base.slice(0, 5).toUpperCase()}${entropy}`;
}

export class CustomerService {
  async list(options: {
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
    tag?: string;
    loyaltyTierKey?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }) {
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = {};
    if (!options.includeDeleted) filter.isDeleted = false;
    if (options.status) filter.status = options.status;
    if (options.tag) filter.tagKeys = options.tag;
    if (options.loyaltyTierKey) filter.loyaltyTierKey = options.loyaltyTierKey;

    if (options.q) {
      const q = options.q.trim();
      filter.$or = [
        { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { firstName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { lastName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { phone: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { referralCode: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
    }

    const sortable = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'status'];
    const sort = parseSort(options, sortable);
    const skip = getPaginationSkip(page, limit);

    const [data, total] = await Promise.all([
      CustomerModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      CustomerModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string, includeDeleted = false) {
    const filter: Record<string, unknown> = { _id: id };
    if (!includeDeleted) filter.isDeleted = false;
    const customer = await CustomerModel.findOne(filter);
    if (!customer) throw ApiError.notFound('Customer not found');
    return customer;
  }

  async getByUserId(userId: string) {
    return CustomerModel.findOne({ userId, isDeleted: false });
  }

  /**
   * Resolve the customer record for the authenticated user.
   * Creates a profile if missing (lazy onboarding for existing auth users).
   */
  async ensureForUser(
    user: Pick<AuthenticatedUser, 'id' | 'email' | 'firstName' | 'lastName'> & {
      phone?: string | null;
    },
    actor?: ActorMeta,
  ): Promise<CustomerDocument> {
    const existing = await this.getByUserId(user.id);
    if (existing) return existing;

    const dbUser = await UserModel.findById(user.id);
    let code = generateReferralCode(user.email.split('@')[0]);
    while (await CustomerModel.exists({ referralCode: code })) {
      code = generateReferralCode();
    }

    const customer = await CustomerModel.create({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? dbUser?.phone ?? null,
      profilePhotoUrl: dbUser?.avatarUrl ?? null,
      status: CUSTOMER_STATUS.ACTIVE,
      referralCode: code,
      loyaltyTierKey: LOYALTY_TIER.SILVER,
      preferences: {
        language: 'en',
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        newsletter: false,
        sms: false,
        pushNotifications: true,
        marketingEmails: false,
        darkMode: false,
      },
    });

    await writeAuditLog({
      action: CUSTOMER_AUDIT.CUSTOMER_CREATED,
      resourceType: 'customers',
      resourceId: customer._id.toString(),
      actorUserId: actor?.userId ?? user.id,
      ip: actor?.ip,
      requestId: actor?.requestId,
      after: toPlain(customer),
      metadata: { source: 'ensureForUser' },
    });

    return customer;
  }

  async assertOwnOrAdmin(
    reqUser: AuthenticatedUser,
    customerId: string,
  ): Promise<CustomerDocument> {
    const customer = await this.getById(customerId);
    const isAdmin = reqUser.permissions.some(
      (p) =>
        p === 'customers.view' ||
        p === 'customers.read' ||
        p === 'customers.update' ||
        p === 'customers.delete',
    );
    const isOwner = customer.userId?.toString() === reqUser.id;
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You can only access your own customer data');
    }
    return customer;
  }

  async updateProfile(customerId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await this.getById(customerId);
    const allowed = [
      'firstName',
      'lastName',
      'phone',
      'profilePhotoUrl',
      'dateOfBirth',
      'gender',
      'language',
      'timezone',
      'country',
    ] as const;

    const $set: Record<string, unknown> = {};
    for (const key of allowed) {
      if (payload[key] !== undefined) $set[key] = payload[key];
    }

    if (Object.keys($set).length === 0) {
      throw ApiError.badRequest('No updatable profile fields provided');
    }

    // Keep preferences language/timezone in sync when profile fields change
    if ($set.language) $set['preferences.language'] = $set.language;
    if ($set.timezone) $set['preferences.timezone'] = $set.timezone;

    const customer = await CustomerModel.findOneAndUpdate(
      { _id: customerId, isDeleted: false },
      { $set },
      { new: true },
    );
    if (!customer) throw ApiError.notFound('Customer not found');

    // Sync core identity back to linked user when present
    if (before.userId) {
      const userUpdate: Record<string, unknown> = {};
      if ($set.firstName) userUpdate.firstName = $set.firstName;
      if ($set.lastName) userUpdate.lastName = $set.lastName;
      if ($set.phone !== undefined) userUpdate.phone = $set.phone;
      if ($set.profilePhotoUrl !== undefined) userUpdate.avatarUrl = $set.profilePhotoUrl;
      if (Object.keys(userUpdate).length) {
        await UserModel.updateOne({ _id: before.userId }, { $set: userUpdate });
      }
    }

    await writeAuditLog({
      action: CUSTOMER_AUDIT.PROFILE_UPDATED,
      resourceType: 'customers',
      resourceId: customerId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
      after: toPlain(customer),
    });
    await writeActivityLog({
      summary: 'Customer profile updated',
      module: 'customers',
      actorUserId: actor.userId,
      ip: actor.ip,
      metadata: { customerId },
    });

    return customer;
  }

  async adminUpdate(customerId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await this.getById(customerId);
    const $set: Record<string, unknown> = { ...payload };
    delete $set.userId;
    delete $set.email;
    delete $set.referralCode;
    delete $set.rewardPointsBalance;

    const customer = await CustomerModel.findOneAndUpdate(
      { _id: customerId, isDeleted: false },
      { $set },
      { new: true },
    );
    if (!customer) throw ApiError.notFound('Customer not found');

    await writeAuditLog({
      action: CUSTOMER_AUDIT.PROFILE_UPDATED,
      resourceType: 'customers',
      resourceId: customerId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
      after: toPlain(customer),
      metadata: { admin: true },
    });

    return customer;
  }

  async softDelete(customerId: string, actor: ActorMeta) {
    const before = await this.getById(customerId);
    const customer = await CustomerModel.findOneAndUpdate(
      { _id: customerId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), status: CUSTOMER_STATUS.INACTIVE } },
      { new: true },
    );

    await writeAuditLog({
      action: CUSTOMER_AUDIT.CUSTOMER_DELETED,
      resourceType: 'customers',
      resourceId: customerId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: toPlain(before),
    });

    return customer;
  }

  async updatePreferences(
    customerId: string,
    payload: {
      preferences?: Record<string, unknown>;
      notificationPreferences?: Record<string, unknown>;
    },
    actor: ActorMeta,
  ) {
    const before = await this.getById(customerId);
    const $set: Record<string, unknown> = {};

    if (payload.preferences) {
      for (const [k, v] of Object.entries(payload.preferences)) {
        $set[`preferences.${k}`] = v;
      }
      if (payload.preferences.language) $set.language = payload.preferences.language;
      if (payload.preferences.timezone) $set.timezone = payload.preferences.timezone;
    }

    if (payload.notificationPreferences) {
      for (const [k, v] of Object.entries(payload.notificationPreferences)) {
        $set[`notificationPreferences.${k}`] = v;
      }
    }

    if (!Object.keys($set).length) {
      throw ApiError.badRequest('No preference fields provided');
    }

    const customer = await CustomerModel.findOneAndUpdate(
      { _id: customerId, isDeleted: false },
      { $set },
      { new: true },
    );

    await writeAuditLog({
      action: CUSTOMER_AUDIT.PREFERENCES_CHANGED,
      resourceType: 'customers',
      resourceId: customerId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: {
        preferences: before.preferences,
        notificationPreferences: before.notificationPreferences,
      },
      after: {
        preferences: customer?.preferences,
        notificationPreferences: customer?.notificationPreferences,
      },
    });

    return customer;
  }

  async seedLoyaltyTiers() {
    const defaults = [
      {
        key: LOYALTY_TIER.SILVER,
        name: 'Silver',
        minPoints: 0,
        benefits: ['Standard shipping rates', 'Birthday offer'],
        upgradeRules: { minLifetimeSpend: 0, minOrders: 0, minPoints: 0 },
        sortOrder: 1,
      },
      {
        key: LOYALTY_TIER.GOLD,
        name: 'Gold',
        minPoints: 1000,
        benefits: ['Free standard shipping', 'Early sale access', '2x reward events'],
        upgradeRules: { minLifetimeSpend: 50000, minOrders: 5, minPoints: 1000 },
        sortOrder: 2,
      },
      {
        key: LOYALTY_TIER.PLATINUM,
        name: 'Platinum',
        minPoints: 5000,
        benefits: ['Free express shipping', 'Dedicated support', 'Exclusive drops'],
        upgradeRules: { minLifetimeSpend: 200000, minOrders: 20, minPoints: 5000 },
        sortOrder: 3,
      },
    ];

    for (const tier of defaults) {
      await LoyaltyTierModel.updateOne({ key: tier.key }, { $setOnInsert: tier }, { upsert: true });
    }

    return LoyaltyTierModel.find({ isDeleted: false }).sort({ sortOrder: 1 });
  }

  async listLoyaltyTiers() {
    const count = await LoyaltyTierModel.countDocuments({ isDeleted: false });
    if (count === 0) return this.seedLoyaltyTiers();
    return LoyaltyTierModel.find({ isDeleted: false }).sort({ sortOrder: 1 });
  }
}

export const customerService = new CustomerService();

export { Types };
