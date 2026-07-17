import type {
  Announcement,
  Brand,
  CmsPage,
  Collection,
  ContactInfo,
  Faq,
  HeroBanner,
  HomeSection,
  PromoBanner,
  PublicSettingRow,
  PublicSettings,
  SocialLink,
} from '@/services/sdk/cms';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
}

function pickId(raw: UnknownRecord): string {
  const id = raw.id ?? raw._id;
  return id ? String(id) : '';
}

export function resolveMediaUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  if (typeof record.url === 'string') return record.url;
  return undefined;
}

export function resolveResponsiveImageUrl(images: unknown): string | undefined {
  const record = asRecord(images);
  return (
    resolveMediaUrl(record.desktop) ??
    resolveMediaUrl(record.tablet) ??
    resolveMediaUrl(record.mobile) ??
    resolveMediaUrl(record)
  );
}

export function normalizePublicSettings(rows: PublicSettingRow[] | PublicSettings): PublicSettings {
  if (!Array.isArray(rows)) return rows;

  const settings: PublicSettings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
    if (row.group) {
      const groupKey = `${row.group}.${row.key}`;
      settings[groupKey] = row.value;
    }
  }

  return settings;
}

export function getSetting<T = unknown>(
  settings: PublicSettings | undefined,
  key: string,
  fallback?: T,
): T | undefined {
  if (!settings) return fallback;
  const value = settings[key];
  return (value === undefined ? fallback : (value as T)) ?? fallback;
}

export function normalizeHeroBanner(raw: unknown): HeroBanner {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    title: asString(record.title),
    subtitle: asString(record.subtitle) || undefined,
    imageUrl: resolveResponsiveImageUrl(record.images),
    linkUrl: asString(record.ctaUrl ?? record.linkUrl) || undefined,
    ctaLabel: asString(record.ctaLabel ?? record.buttonText) || undefined,
    priority: asNumber(record.priority),
    status: asString(record.status) || undefined,
  };
}

export function normalizePromoBanner(raw: unknown): PromoBanner {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    title: asString(record.title),
    subtitle: asString(record.subtitle) || undefined,
    placement: asString(record.placement) || undefined,
    imageUrl: resolveResponsiveImageUrl(record.images),
    linkUrl: asString(record.ctaUrl ?? record.linkUrl) || undefined,
    ctaLabel: asString(record.ctaLabel ?? record.buttonText) || undefined,
    priority: asNumber(record.priority),
  };
}

export function normalizeAnnouncement(raw: unknown): Announcement {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    message: asString(record.message),
    linkUrl: asString(record.linkUrl) || undefined,
    linkLabel: asString(record.linkLabel) || undefined,
    backgroundColor: asString(record.backgroundColor) || undefined,
    textColor: asString(record.textColor) || undefined,
    priority: asNumber(record.priority),
  };
}

export function normalizeHomeSection(raw: unknown): HomeSection {
  const record = asRecord(raw);
  const content = record.content ?? record.config;
  return {
    id: pickId(record),
    key: asString(record.key),
    title: asString(record.title) || undefined,
    subtitle: asString(record.subtitle) || undefined,
    type: asString(record.type) || undefined,
    sortOrder: asNumber(record.sortOrder),
    config: asRecord(content),
    status: asString(record.status) || undefined,
  };
}

export function normalizeCmsPage(raw: unknown): CmsPage {
  const record = asRecord(raw);
  const seo = asRecord(record.seo);
  return {
    id: pickId(record),
    slug: asString(record.slug),
    title: asString(record.title),
    body: asString(record.content ?? record.body),
    excerpt: asString(record.excerpt) || undefined,
    seo: Object.keys(seo).length ? seo : undefined,
    status: asString(record.status) || undefined,
    featuredImageUrl: resolveMediaUrl(record.featuredImage),
  };
}

export function normalizeFaq(raw: unknown): Faq {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    question: asString(record.question),
    answer: asString(record.answer),
    category: asString(record.category) || undefined,
    sortOrder: asNumber(record.sortOrder),
  };
}

export function normalizeBrand(raw: unknown): Brand {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    name: asString(record.name),
    slug: asString(record.slug),
    description: asString(record.description) || undefined,
    logoUrl: resolveMediaUrl(record.logo ?? record.image),
    sortOrder: asNumber(record.sortOrder),
  };
}

export function normalizeCollection(raw: unknown): Collection {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    name: asString(record.name),
    slug: asString(record.slug),
    description: asString(record.description) || undefined,
    imageUrl: resolveMediaUrl(record.image ?? record.coverImage),
    sortOrder: asNumber(record.sortOrder),
  };
}

export function normalizeSocialLink(raw: unknown): SocialLink {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    platform: asString(record.platform),
    url: asString(record.url),
    icon: asString(record.icon) || undefined,
    sortOrder: asNumber(record.sortOrder),
  };
}

export function normalizeContactInfo(raw: unknown): ContactInfo {
  const record = asRecord(raw);
  return {
    id: pickId(record),
    label: asString(record.label),
    type: asString(record.type) || undefined,
    value: asString(record.value),
    isPrimary: Boolean(record.isPrimary),
    sortOrder: asNumber(record.sortOrder),
  };
}

export function mapList<T>(items: unknown[], mapper: (item: unknown) => T): T[] {
  return items.map(mapper);
}

export function activeOnly<T extends { status?: string }>(items: T[]): T[] {
  return items.filter(
    (item) => !item.status || item.status === 'active' || item.status === 'published',
  );
}

export function sortByPriority<T extends { priority?: number; sortOrder?: number }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aScore = a.priority ?? a.sortOrder ?? 0;
    const bScore = b.priority ?? b.sortOrder ?? 0;
    return bScore - aScore;
  });
}

export function extractSeo(page?: CmsPage | null, settings?: PublicSettings) {
  const seo = asRecord(page?.seo);
  const storeName =
    getSetting<string>(settings, 'store.name') ?? getSetting<string>(settings, 'storeName');
  return {
    title: asString(seo.title) || page?.title,
    description: asString(seo.description) || page?.excerpt,
    image: asString(seo.ogImage) || page?.featuredImageUrl,
    canonical: asString(seo.canonicalUrl) || undefined,
    siteName: storeName,
  };
}
