import { Schema, model, type Document, type Model, type Types } from 'mongoose';
import {
  CUSTOMER_STATUS,
  ADDRESS_TYPE,
  ADDRESS_LABEL,
  WISHLIST_VISIBILITY,
  LOYALTY_TIER,
  REFERRAL_STATUS,
  REWARD_TX_TYPE,
} from '@/constants/customer';

const softDelete = {
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

const preferencesSchema = new Schema(
  {
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'LKR' },
    timezone: { type: String, default: 'Asia/Colombo' },
    newsletter: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
  },
  { _id: false },
);

const notificationPreferencesSchema = new Schema(
  {
    orderUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
    wishlistAlerts: { type: Boolean, default: true },
    stockAlerts: { type: Boolean, default: true },
    referralUpdates: { type: Boolean, default: true },
  },
  { _id: false },
);

/* -------------------------------------------------------------------------- */
/* Customer profile                                                            */
/* -------------------------------------------------------------------------- */

export interface CustomerDocument extends Document {
  userId?: Types.ObjectId | null;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  language: string;
  timezone: string;
  country?: string | null;
  status: string;
  preferences: {
    language: string;
    currency: string;
    timezone: string;
    newsletter: boolean;
    sms: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    darkMode: boolean;
  };
  notificationPreferences: {
    orderUpdates: boolean;
    promotions: boolean;
    wishlistAlerts: boolean;
    stockAlerts: boolean;
    referralUpdates: boolean;
  };
  defaultShippingAddressId?: Types.ObjectId | null;
  defaultBillingAddressId?: Types.ObjectId | null;
  tagIds: Types.ObjectId[];
  tagKeys: string[];
  loyaltyTierId?: Types.ObjectId | null;
  loyaltyTierKey: string;
  rewardPointsBalance: number;
  referralCode: string;
  referredByCustomerId?: Types.ObjectId | null;
  lifetimeValue: number;
  orderCount: number;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<CustomerDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    profilePhotoUrl: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: null },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Colombo' },
    country: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(CUSTOMER_STATUS),
      default: CUSTOMER_STATUS.ACTIVE,
      index: true,
    },
    preferences: { type: preferencesSchema, default: () => ({}) },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
    defaultShippingAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerAddress',
      default: null,
    },
    defaultBillingAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerAddress',
      default: null,
    },
    tagIds: [{ type: Schema.Types.ObjectId, ref: 'CustomerTag' }],
    tagKeys: { type: [String], default: [], index: true },
    loyaltyTierId: { type: Schema.Types.ObjectId, ref: 'LoyaltyTier', default: null },
    loyaltyTierKey: { type: String, default: LOYALTY_TIER.SILVER, index: true },
    rewardPointsBalance: { type: Number, default: 0, min: 0 },
    referralCode: { type: String, required: true, uppercase: true, trim: true },
    referredByCustomerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    lifetimeValue: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ...softDelete,
  },
  { timestamps: true, collection: 'customers' },
);

customerSchema.index({ userId: 1 }, { unique: true, sparse: true });
customerSchema.index({ email: 1 }, { unique: true });
customerSchema.index({ phone: 1 }, { sparse: true });
customerSchema.index({ referralCode: 1 }, { unique: true });
customerSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

export const CustomerModel: Model<CustomerDocument> = model('Customer', customerSchema);

/* -------------------------------------------------------------------------- */
/* Addresses                                                                   */
/* -------------------------------------------------------------------------- */

export const CustomerAddressModel = model(
  'CustomerAddress',
  new Schema(
    {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      type: {
        type: String,
        enum: Object.values(ADDRESS_TYPE),
        default: ADDRESS_TYPE.BOTH,
      },
      label: {
        type: String,
        enum: Object.values(ADDRESS_LABEL),
        default: ADDRESS_LABEL.HOME,
      },
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      line1: { type: String, required: true, trim: true },
      line2: { type: String, default: null },
      city: { type: String, required: true, trim: true },
      state: { type: String, default: null },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true, uppercase: true },
      isDefaultShipping: { type: Boolean, default: false },
      isDefaultBilling: { type: Boolean, default: false },
      ...softDelete,
    },
    { timestamps: true, collection: 'customer_addresses' },
  ),
);
CustomerAddressModel.schema.index({ customerId: 1, isDeleted: 1 });

/* -------------------------------------------------------------------------- */
/* Wishlists                                                                   */
/* -------------------------------------------------------------------------- */

export const WishlistModel = model(
  'Wishlist',
  new Schema(
    {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      name: { type: String, required: true, trim: true },
      visibility: {
        type: String,
        enum: Object.values(WISHLIST_VISIBILITY),
        default: WISHLIST_VISIBILITY.PRIVATE,
      },
      shareToken: { type: String, default: null, index: true },
      isDefault: { type: Boolean, default: false },
      itemCount: { type: Number, default: 0 },
      ...softDelete,
    },
    { timestamps: true, collection: 'wishlists' },
  ),
);

export const WishlistItemModel = model(
  'WishlistItem',
  new Schema(
    {
      wishlistId: { type: Schema.Types.ObjectId, ref: 'Wishlist', required: true, index: true },
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
      note: { type: String, default: null },
      addedAt: { type: Date, default: Date.now },
      ...softDelete,
    },
    { timestamps: true, collection: 'wishlist_items' },
  ),
);
WishlistItemModel.schema.index({ wishlistId: 1, productId: 1, variantId: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* Recently viewed / saved items                                               */
/* -------------------------------------------------------------------------- */

export const RecentlyViewedModel = model(
  'RecentlyViewed',
  new Schema(
    {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
      viewedAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'recently_viewed' },
  ),
);
RecentlyViewedModel.schema.index({ customerId: 1, productId: 1, variantId: 1 }, { unique: true });

export const SavedItemModel = model(
  'SavedItem',
  new Schema(
    {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
      note: { type: String, default: null },
      ...softDelete,
    },
    { timestamps: true, collection: 'saved_items' },
  ),
);
SavedItemModel.schema.index({ customerId: 1, productId: 1, variantId: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* Tags & notes                                                                */
/* -------------------------------------------------------------------------- */

export const CustomerTagModel = model(
  'CustomerTag',
  new Schema(
    {
      key: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, required: true, trim: true },
      color: { type: String, default: null },
      description: { type: String, default: null },
      isSystem: { type: Boolean, default: false },
      ...softDelete,
    },
    { timestamps: true, collection: 'customer_tags' },
  ),
);
CustomerTagModel.schema.index({ key: 1 }, { unique: true });

export const CustomerNoteModel = model(
  'CustomerNote',
  new Schema(
    {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      body: { type: String, required: true, trim: true },
      isPinned: { type: Boolean, default: false },
      ...softDelete,
    },
    { timestamps: true, collection: 'customer_notes' },
  ),
);

/* -------------------------------------------------------------------------- */
/* Rewards (structure)                                                         */
/* -------------------------------------------------------------------------- */

export const RewardLedgerModel = model(
  'RewardLedger',
  new Schema(
    {
      customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
      type: {
        type: String,
        enum: Object.values(REWARD_TX_TYPE),
        required: true,
        index: true,
      },
      points: { type: Number, required: true },
      balanceAfter: { type: Number, required: true },
      reason: { type: String, default: null },
      referenceType: { type: String, default: 'manual' },
      referenceId: { type: Schema.Types.ObjectId, default: null },
      expiresAt: { type: Date, default: null },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'reward_ledger' },
  ),
);

/* -------------------------------------------------------------------------- */
/* Loyalty tiers (structure)                                                   */
/* -------------------------------------------------------------------------- */

export const LoyaltyTierModel = model(
  'LoyaltyTier',
  new Schema(
    {
      key: {
        type: String,
        enum: Object.values(LOYALTY_TIER),
        required: true,
      },
      name: { type: String, required: true },
      minPoints: { type: Number, default: 0 },
      benefits: { type: [String], default: [] },
      upgradeRules: {
        type: new Schema(
          {
            minLifetimeSpend: { type: Number, default: 0 },
            minOrders: { type: Number, default: 0 },
            minPoints: { type: Number, default: 0 },
          },
          { _id: false },
        ),
        default: () => ({}),
      },
      sortOrder: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true },
      ...softDelete,
    },
    { timestamps: true, collection: 'loyalty_tiers' },
  ),
);
LoyaltyTierModel.schema.index({ key: 1 }, { unique: true });

/* -------------------------------------------------------------------------- */
/* Referrals (structure)                                                       */
/* -------------------------------------------------------------------------- */

export const ReferralModel = model(
  'Referral',
  new Schema(
    {
      referrerCustomerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
        index: true,
      },
      referralCode: { type: String, required: true, uppercase: true, index: true },
      inviteeEmail: { type: String, default: null, lowercase: true },
      inviteeCustomerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        default: null,
      },
      status: {
        type: String,
        enum: Object.values(REFERRAL_STATUS),
        default: REFERRAL_STATUS.PENDING,
        index: true,
      },
      rewardPoints: { type: Number, default: 0 },
      rewardedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'referrals' },
  ),
);
