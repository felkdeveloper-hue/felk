import { CustomerModel, RewardLedgerModel, ReferralModel } from '@/models/customer.models';
import { customerService } from '@/services/customer.service';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { REFERRAL_STATUS, REWARD_TX_TYPE } from '@/constants/customer';

/**
 * Rewards structure only — no checkout redemption pipeline yet.
 */
export class RewardService {
  async getBalance(customerId: string) {
    const customer = await customerService.getById(customerId);
    return {
      customerId,
      points: customer.rewardPointsBalance,
      loyaltyTierKey: customer.loyaltyTierKey,
    };
  }

  async listHistory(customerId: string, options: { page?: number; limit?: number; type?: string }) {
    await customerService.getById(customerId);
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { customerId };
    if (options.type) filter.type = options.type;

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      RewardLedgerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RewardLedgerModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async earn(
    customerId: string,
    input: {
      points: number;
      reason?: string;
      referenceType?: string;
      referenceId?: string;
      expiresAt?: Date | string | null;
    },
    actor: ActorMeta,
  ) {
    if (input.points <= 0) throw ApiError.badRequest('Points must be positive');
    const customer = await customerService.getById(customerId);
    const balanceAfter = customer.rewardPointsBalance + input.points;

    customer.rewardPointsBalance = balanceAfter;
    await customer.save();

    const entry = await RewardLedgerModel.create({
      customerId,
      type: REWARD_TX_TYPE.EARN,
      points: input.points,
      balanceAfter,
      reason: input.reason ?? 'Points earned',
      referenceType: input.referenceType ?? 'manual',
      referenceId: input.referenceId ?? null,
      expiresAt: input.expiresAt ?? null,
      createdBy: actor.userId ?? null,
    });

    await writeAuditLog({
      action: 'customers.rewards_earned',
      resourceType: 'reward_ledger',
      resourceId: entry._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { customerId, points: input.points },
    });

    return entry;
  }

  /** Structure for future checkout redeem — records intent only for now. */
  async redeem(
    customerId: string,
    input: { points: number; reason?: string; referenceType?: string; referenceId?: string },
    actor: ActorMeta,
  ) {
    if (input.points <= 0) throw ApiError.badRequest('Points must be positive');
    const customer = await customerService.getById(customerId);
    if (customer.rewardPointsBalance < input.points) {
      throw ApiError.unprocessable('Insufficient reward points', undefined, 'INSUFFICIENT_POINTS');
    }

    const balanceAfter = customer.rewardPointsBalance - input.points;
    customer.rewardPointsBalance = balanceAfter;
    await customer.save();

    const entry = await RewardLedgerModel.create({
      customerId,
      type: REWARD_TX_TYPE.REDEEM,
      points: -input.points,
      balanceAfter,
      reason: input.reason ?? 'Points redeemed (structure — no checkout)',
      referenceType: input.referenceType ?? 'manual',
      referenceId: input.referenceId ?? null,
      createdBy: actor.userId ?? null,
    });

    await writeAuditLog({
      action: 'customers.rewards_redeemed',
      resourceType: 'reward_ledger',
      resourceId: entry._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      metadata: { customerId, points: input.points, checkout: false },
    });

    return entry;
  }

  async expireDue(actor: ActorMeta = {}) {
    const due = await RewardLedgerModel.find({
      type: REWARD_TX_TYPE.EARN,
      expiresAt: { $lte: new Date(), $ne: null },
    }).limit(100);

    const results = [];
    for (const entry of due) {
      try {
        const customer = await customerService.getById(entry.customerId.toString());
        const points = Math.min(customer.rewardPointsBalance, Math.abs(entry.points));
        if (points <= 0) {
          results.push({ id: entry._id.toString(), status: 'skipped' });
          continue;
        }

        const balanceAfter = customer.rewardPointsBalance - points;
        customer.rewardPointsBalance = balanceAfter;
        await customer.save();

        await RewardLedgerModel.create({
          customerId: customer._id,
          type: REWARD_TX_TYPE.EXPIRE,
          points: -points,
          balanceAfter,
          reason: 'Points expired',
          referenceType: 'expiry',
          referenceId: entry._id,
          createdBy: actor.userId ?? null,
        });

        // clear expiry marker so we don't reprocess
        entry.expiresAt = null;
        await entry.save();

        results.push({ id: entry._id.toString(), status: 'expired', points });
      } catch {
        results.push({ id: entry._id.toString(), status: 'error' });
      }
    }

    return { processed: results.length, results };
  }
}

/**
 * Referral structure — invitations + status tracking; checkout reward later.
 */
export class ReferralService {
  async getMyCode(customerId: string) {
    const customer = await customerService.getById(customerId);
    return {
      customerId,
      referralCode: customer.referralCode,
      invitePath: `/register?ref=${customer.referralCode}`,
    };
  }

  async list(customerId: string, options: { page?: number; limit?: number; status?: string }) {
    await customerService.getById(customerId);
    const { page, limit } = parsePagination(options);
    const filter: Record<string, unknown> = { referrerCustomerId: customerId };
    if (options.status) filter.status = options.status;

    const skip = getPaginationSkip(page, limit);
    const [data, total] = await Promise.all([
      ReferralModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ReferralModel.countDocuments(filter),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async invite(
    customerId: string,
    payload: { inviteeEmail: string; expiresAt?: Date | string | null },
    actor: ActorMeta,
  ) {
    const customer = await customerService.getById(customerId);
    const email = payload.inviteeEmail.toLowerCase().trim();

    const existing = await ReferralModel.findOne({
      referrerCustomerId: customerId,
      inviteeEmail: email,
      status: { $in: [REFERRAL_STATUS.PENDING, REFERRAL_STATUS.ACCEPTED] },
    });
    if (existing) throw ApiError.conflict('Invitation already pending for this email');

    const referral = await ReferralModel.create({
      referrerCustomerId: customerId,
      referralCode: customer.referralCode,
      inviteeEmail: email,
      status: REFERRAL_STATUS.PENDING,
      expiresAt: payload.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      rewardPoints: 0,
    });

    await writeAuditLog({
      action: 'customers.referral_invited',
      resourceType: 'referrals',
      resourceId: referral._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: referral.toObject() as Record<string, unknown>,
    });

    return referral;
  }

  /** Attach invitee customer when they register with a referral code (structure hook). */
  async acceptByCode(code: string, inviteeCustomerId: string, actor: ActorMeta = {}) {
    const referrer = await CustomerModel.findOne({
      referralCode: code.toUpperCase(),
      isDeleted: false,
    });
    if (!referrer) throw ApiError.notFound('Invalid referral code');
    if (referrer._id.toString() === inviteeCustomerId) {
      throw ApiError.badRequest('Cannot refer yourself');
    }

    const invitee = await customerService.getById(inviteeCustomerId);
    if (invitee.referredByCustomerId) {
      throw ApiError.conflict('Customer already referred');
    }

    invitee.referredByCustomerId = referrer._id;
    await invitee.save();

    const referral = await ReferralModel.create({
      referrerCustomerId: referrer._id,
      referralCode: referrer.referralCode,
      inviteeEmail: invitee.email,
      inviteeCustomerId: invitee._id,
      status: REFERRAL_STATUS.ACCEPTED,
      rewardPoints: 0,
    });

    await writeAuditLog({
      action: 'customers.referral_accepted',
      resourceType: 'referrals',
      resourceId: referral._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: referral.toObject() as Record<string, unknown>,
    });

    return referral;
  }
}

export const rewardService = new RewardService();
export const referralService = new ReferralService();
