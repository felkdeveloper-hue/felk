import { http } from '@/lib/http-client';
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

  listAddresses(): Promise<CustomerAddress[]> {
    return http.get<CustomerAddress[]>('/customers/me/addresses');
  },

  createAddress(payload: CustomerAddressInput): Promise<CustomerAddress> {
    return http.post<CustomerAddress>('/customers/me/addresses', payload);
  },

  updateAddress(
    addressId: string,
    payload: Partial<CustomerAddressInput>,
  ): Promise<CustomerAddress> {
    return http.patch<CustomerAddress>(`/customers/me/addresses/${addressId}`, payload);
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
