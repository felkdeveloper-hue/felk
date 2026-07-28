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
  /** Optional — older API deploys may omit these; hooks fall back to dedicated endpoints. */
  promoBanners?: unknown[];
  brands?: unknown[];
  collections?: unknown[];
  colors?: unknown[];
  sizes?: unknown[];
  materials?: unknown[];
  occasions?: unknown[];
}

/** Single-request bootstrap for the public storefront shell. */
export const storefrontApi = {
  async getBootstrap(): Promise<StorefrontBootstrapPayload> {
    return http.get<StorefrontBootstrapPayload>('/storefront/bootstrap');
  },
};
