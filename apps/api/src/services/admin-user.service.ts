import { Types } from 'mongoose';
import { z } from 'zod';
import { CART_STATUS } from '@/constants/cart';
import { ORDER_STATUS } from '@/constants/order-status';
import { paginationQuerySchema } from '@/schemas/common.schema';
import { CartItemModel, CartModel, CustomerModel, OrderModel, UserModel } from '@/models';
import { buildPaginationMeta, getPaginationSkip, parsePagination } from '@/utils/pagination';
import { parseSort } from '@/utils/sorting';

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  roleKey: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

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

    const data = users.map((user) => {
      const customerId = customerByUserId.get(String(user._id));
      const customerIdStr = customerId ? String(customerId) : undefined;
      const hasPassword = Boolean(user.passwordHash);

      return {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleKey: user.roleKey,
        status: user.status,
        hasPassword,
        passwordDisplay: hasPassword ? '••••••••' : '—',
        authProvider: user.googleId ? 'google' : 'password',
        customerId: customerIdStr,
        cartItemCount: customerIdStr ? (cartCountByCustomer.get(customerIdStr) ?? 0) : 0,
        purchasedItemCount: customerIdStr ? (purchaseCountByCustomer.get(customerIdStr) ?? 0) : 0,
        lastLoginAt: user.lastLoginAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }
}

export const adminUserService = new AdminUserService();
