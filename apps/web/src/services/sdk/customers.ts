import { http } from '@/lib/http-client';
import { normalizeId } from '@/lib/utils';
import type { MessageResult } from '@/types';

export interface CustomerProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  language?: string;
  timezone?: string;
  country?: string | null;
  [key: string]: unknown;
}

export interface CustomerAddress {
  id: string;
  type?: 'billing' | 'shipping' | 'both' | string;
  label?: 'home' | 'office' | 'other' | string;
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode?: string;
  country: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  [key: string]: unknown;
}

export type CustomerAddressInput = Omit<CustomerAddress, 'id'>;

export interface CustomerPreferenceValues {
  language?: string;
  currency?: string;
  timezone?: string;
  newsletter?: boolean;
  sms?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  darkMode?: boolean;
}

export interface CustomerNotificationPreferences {
  orderUpdates?: boolean;
  promotions?: boolean;
  wishlistAlerts?: boolean;
  stockAlerts?: boolean;
  referralUpdates?: boolean;
}

export interface CustomerPreferences {
  preferences?: CustomerPreferenceValues;
  notificationPreferences?: CustomerNotificationPreferences;
}

export interface Wishlist {
  id: string;
  name: string;
  isDefault?: boolean;
  shareToken?: string;
  items: WishlistItem[];
  [key: string]: unknown;
}

export interface WishlistItem {
  id: string;
  productId: string;
  variantId?: string;
  addedAt?: string;
}

export interface RecentlyViewedItem {
  productId: string;
  viewedAt: string;
}

export interface SavedItem {
  id: string;
  productId: string;
  variantId?: string;
}

export interface RewardBalance {
  balance: number;
  tier?: string;
  [key: string]: unknown;
}

export interface RewardHistoryEntry {
  id: string;
  type: string;
  points: number;
  createdAt: string;
}

export interface ReferralSummary {
  code: string;
  invitations: unknown[];
  [key: string]: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/** API returns Mongo `_id`; storefront always uses `id`. */
function normalizeAddress(raw: unknown): CustomerAddress {
  const record = asRecord(raw);
  return {
    ...record,
    id: normalizeId(record),
    type: typeof record.type === 'string' ? record.type : undefined,
    label: typeof record.label === 'string' ? record.label : undefined,
    fullName: String(record.fullName ?? ''),
    phone: typeof record.phone === 'string' ? record.phone : undefined,
    line1: String(record.line1 ?? ''),
    line2: typeof record.line2 === 'string' ? record.line2 : null,
    city: String(record.city ?? ''),
    state: typeof record.state === 'string' ? record.state : null,
    postalCode: typeof record.postalCode === 'string' ? record.postalCode : undefined,
    country: String(record.country ?? ''),
    isDefaultShipping: Boolean(record.isDefaultShipping),
    isDefaultBilling: Boolean(record.isDefaultBilling),
  };
}

/** Typed SDK for `/customers/me/*` (self-service storefront account). */
export const customersApi = {
  getMe(): Promise<CustomerProfile> {
    return http.get<CustomerProfile>('/customers/me');
  },

  updateMe(payload: Partial<CustomerProfile>): Promise<CustomerProfile> {
    return http.patch<CustomerProfile>('/customers/me', payload);
  },

  getPreferences(): Promise<CustomerPreferences> {
    return http.get<CustomerPreferences>('/customers/me/preferences');
  },

  updatePreferences(payload: CustomerPreferences): Promise<CustomerPreferences> {
    return http.patch<CustomerPreferences>('/customers/me/preferences', payload);
  },

  async listAddresses(): Promise<CustomerAddress[]> {
    const rows = await http.get<unknown[]>('/customers/me/addresses');
    return (Array.isArray(rows) ? rows : []).map(normalizeAddress);
  },

  async createAddress(payload: CustomerAddressInput): Promise<CustomerAddress> {
    const created = await http.post<unknown>('/customers/me/addresses', payload);
    return normalizeAddress(created);
  },

  async updateAddress(
    addressId: string,
    payload: Partial<CustomerAddressInput>,
  ): Promise<CustomerAddress> {
    const updated = await http.patch<unknown>(`/customers/me/addresses/${addressId}`, payload);
    return normalizeAddress(updated);
  },

  removeAddress(addressId: string): Promise<MessageResult> {
    return http.delete<MessageResult>(`/customers/me/addresses/${addressId}`);
  },

  listWishlists(): Promise<Wishlist[]> {
    return http.get<Wishlist[]>('/customers/me/wishlists');
  },

  createWishlist(name: string): Promise<Wishlist> {
    return http.post<Wishlist>('/customers/me/wishlists', { name });
  },

  getWishlist(wishlistId: string): Promise<Wishlist> {
    return http.get<Wishlist>(`/customers/me/wishlists/${wishlistId}`);
  },

  updateWishlist(wishlistId: string, payload: Partial<{ name: string }>): Promise<Wishlist> {
    return http.patch<Wishlist>(`/customers/me/wishlists/${wishlistId}`, payload);
  },

  removeWishlist(wishlistId: string): Promise<MessageResult> {
    return http.delete<MessageResult>(`/customers/me/wishlists/${wishlistId}`);
  },

  addWishlistItem(
    wishlistId: string,
    payload: { productId: string; variantId?: string },
  ): Promise<Wishlist> {
    return http.post<Wishlist>(`/customers/me/wishlists/${wishlistId}/items`, payload);
  },

  removeWishlistItem(wishlistId: string, itemId: string): Promise<Wishlist> {
    return http.delete<Wishlist>(`/customers/me/wishlists/${wishlistId}/items/${itemId}`);
  },

  shareWishlist(wishlistId: string): Promise<{ shareToken: string }> {
    return http.post<{ shareToken: string }>(`/customers/me/wishlists/${wishlistId}/share`);
  },

  getSharedWishlist(shareToken: string): Promise<Wishlist> {
    return http.get<Wishlist>(`/customers/wishlists/shared/${shareToken}`);
  },

  listRecentlyViewed(limit?: number): Promise<RecentlyViewedItem[]> {
    return http.get<RecentlyViewedItem[]>('/customers/me/recently-viewed', {
      params: limit ? { limit } : undefined,
    });
  },

  trackRecentlyViewed(productId: string): Promise<RecentlyViewedItem> {
    return http.post<RecentlyViewedItem>('/customers/me/recently-viewed', { productId });
  },

  clearRecentlyViewed(): Promise<MessageResult> {
    return http.delete<MessageResult>('/customers/me/recently-viewed');
  },

  listSavedItems(): Promise<SavedItem[]> {
    return http.get<SavedItem[]>('/customers/me/saved-items');
  },

  addSavedItem(payload: { productId: string; variantId?: string }): Promise<SavedItem> {
    return http.post<SavedItem>('/customers/me/saved-items', payload);
  },

  removeSavedItem(itemId: string): Promise<MessageResult> {
    return http.delete<MessageResult>(`/customers/me/saved-items/${itemId}`);
  },

  getRewardsBalance(): Promise<RewardBalance> {
    return http.get<RewardBalance>('/customers/me/rewards');
  },

  getRewardsHistory(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<RewardHistoryEntry[]> {
    return http.get<RewardHistoryEntry[]>('/customers/me/rewards/history', { params });
  },

  getReferrals(): Promise<ReferralSummary> {
    return http.get<ReferralSummary>('/customers/me/referrals');
  },

  inviteReferral(email: string): Promise<MessageResult> {
    return http.post<MessageResult>('/customers/me/referrals/invite', { inviteeEmail: email });
  },

  acceptReferral(referralCode: string): Promise<MessageResult> {
    return http.post<MessageResult>('/customers/me/referrals/accept', { referralCode });
  },
};
