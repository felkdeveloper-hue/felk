import { http } from '@/lib/http-client';
import type { PublicSettingRow, PublicSettings } from './cms';

export interface StorefrontBootstrapPayload {
  settings: PublicSettingRow[] | PublicSettings;
  categories: unknown[];
  heroBanners: unknown[];
  homeSections: unknown[];
  announcements: unknown[];
  socialLinks: unknown[];
  contactInfos: unknown[];
  pages: unknown[];
}

/** Single-request bootstrap for the public storefront shell. */
export const storefrontApi = {
  async getBootstrap(): Promise<StorefrontBootstrapPayload> {
    return http.get<StorefrontBootstrapPayload>('/storefront/bootstrap');
  },
};
