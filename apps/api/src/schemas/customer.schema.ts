import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema } from '@/schemas/common.schema';
import {
  CUSTOMER_STATUS,
  ADDRESS_TYPE,
  ADDRESS_LABEL,
  WISHLIST_VISIBILITY,
  LOYALTY_TIER,
} from '@/constants/customer';

export const customerListQuerySchema = paginationQuerySchema.extend({
  status: z.string().optional(),
  tag: z.string().optional(),
  loyaltyTierKey: z.enum(Object.values(LOYALTY_TIER) as [string, ...string[]]).optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export const customerProfileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  profilePhotoUrl: z.string().url().nullable().optional().or(z.literal('')),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: z.string().trim().max(40).nullable().optional(),
  language: z.string().trim().max(20).optional(),
  timezone: z.string().trim().max(80).optional(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((s) => s.toUpperCase())
    .nullable()
    .optional(),
});

export const customerAdminUpdateSchema = customerProfileUpdateSchema.extend({
  status: z.enum(Object.values(CUSTOMER_STATUS) as [string, ...string[]]).optional(),
  loyaltyTierKey: z.enum(Object.values(LOYALTY_TIER) as [string, ...string[]]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const preferencesUpdateSchema = z.object({
  preferences: z
    .object({
      language: z.string().trim().max(20).optional(),
      currency: z.string().trim().min(3).max(3).optional(),
      timezone: z.string().trim().max(80).optional(),
      newsletter: z.boolean().optional(),
      sms: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
      darkMode: z.boolean().optional(),
    })
    .optional(),
  notificationPreferences: z
    .object({
      orderUpdates: z.boolean().optional(),
      promotions: z.boolean().optional(),
      wishlistAlerts: z.boolean().optional(),
      stockAlerts: z.boolean().optional(),
      referralUpdates: z.boolean().optional(),
    })
    .optional(),
});

export const addressCreateSchema = z.object({
  type: z.enum(Object.values(ADDRESS_TYPE) as [string, ...string[]]).optional(),
  label: z.enum(Object.values(ADDRESS_LABEL) as [string, ...string[]]).optional(),
  fullName: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(5).max(40),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().min(1).max(40),
  country: z.string().trim().length(2),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

export const addressUpdateSchema = addressCreateSchema.partial();

export const wishlistCreateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  visibility: z.enum(Object.values(WISHLIST_VISIBILITY) as [string, ...string[]]).optional(),
  isDefault: z.boolean().optional(),
});

export const wishlistUpdateSchema = wishlistCreateSchema.partial();

export const wishlistItemCreateSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
});

export const recentlyViewedCreateSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.nullable().optional(),
});

export const savedItemCreateSchema = recentlyViewedCreateSchema.extend({
  note: z.string().trim().max(300).nullable().optional(),
});

export const rewardPointsSchema = z.object({
  points: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
  referenceType: z.string().optional(),
  referenceId: objectIdSchema.optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const referralInviteSchema = z.object({
  inviteeEmail: z.string().email(),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const referralAcceptSchema = z.object({
  referralCode: z.string().trim().min(3).max(40),
});

export const noteCreateSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isPinned: z.boolean().optional(),
});

export const noteUpdateSchema = noteCreateSchema.partial();

export const customerTagCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  color: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(300).nullable().optional(),
});

export const assignTagsSchema = z.object({
  tagKeys: z.array(z.string().trim().min(1)).min(1).max(50),
});

export const customerIdParamsSchema = z.object({ customerId: objectIdSchema });
export const customerResourceIdParamsSchema = z.object({ id: objectIdSchema });
export const addressIdParamsSchema = z.object({
  customerId: objectIdSchema,
  addressId: objectIdSchema,
});
export const wishlistIdParamsSchema = z.object({
  customerId: objectIdSchema,
  wishlistId: objectIdSchema,
});
export const wishlistItemParamsSchema = z.object({
  customerId: objectIdSchema,
  wishlistId: objectIdSchema,
  itemId: objectIdSchema,
});
export const noteIdParamsSchema = z.object({
  customerId: objectIdSchema,
  noteId: objectIdSchema,
});
export const tagKeyParamsSchema = z.object({
  customerId: objectIdSchema,
  tagKey: z.string().trim().min(1),
});

export const meAddressIdParamsSchema = z.object({ addressId: objectIdSchema });
export const meWishlistIdParamsSchema = z.object({ wishlistId: objectIdSchema });
export const meWishlistItemParamsSchema = z.object({
  wishlistId: objectIdSchema,
  itemId: objectIdSchema,
});
export const meSavedItemParamsSchema = z.object({ itemId: objectIdSchema });
