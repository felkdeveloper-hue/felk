import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  profilePhotoUrl: z.string().url().optional().or(z.literal('')),
});

export const addressSchema = z.object({
  type: z.enum(['billing', 'shipping', 'both']).default('both'),
  label: z.enum(['home', 'office', 'other']).optional(),
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone is required'),
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().length(2, 'Use a 2-letter country code'),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

export const preferencesSchema = z.object({
  language: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  newsletter: z.boolean().default(false),
  sms: z.boolean().default(false),
  pushNotifications: z.boolean().default(false),
  marketingEmails: z.boolean().default(false),
  orderUpdates: z.boolean().default(true),
  promotions: z.boolean().default(false),
  wishlistAlerts: z.boolean().default(false),
  stockAlerts: z.boolean().default(false),
  referralUpdates: z.boolean().default(false),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type AddressFormValues = z.infer<typeof addressSchema>;
export type PreferencesFormValues = z.infer<typeof preferencesSchema>;
