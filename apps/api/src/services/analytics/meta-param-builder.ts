import { isIP } from 'node:net';
import { createRequire } from 'node:module';
import type { Request } from 'express';
import type { ParamBuilder as ParamBuilderClass } from 'capi-param-builder-nodejs';
import { appConfig } from '@/config/app.config.js';
import { getClientIp } from '@/services/platform-analytics/geoip.util.js';

const { ParamBuilder } = createRequire(import.meta.url)('capi-param-builder-nodejs') as {
  ParamBuilder: typeof ParamBuilderClass;
};

/** One hasher instance — getNormalizedAndHashedPII is stateless. */
const hasher = new ParamBuilder();

const META_CLICK_ID = /^fb\./;

export type MetaPiiType =
  | 'email'
  | 'phone'
  | 'first_name'
  | 'last_name'
  | 'date_of_birth'
  | 'gender'
  | 'city'
  | 'state'
  | 'zip_code'
  | 'country'
  | 'external_id';

export type MetaClickParams = {
  fbp?: string;
  fbc?: string;
  clientIp?: string;
};

function hostnameFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

/** ETLD+1 hints so the SDK can recommend first-party cookie domains. */
export function metaParamBuilderDomains(): string[] {
  const hosts = new Set<string>(['localhost']);
  const origins = appConfig.cors?.origins ?? [];
  for (const origin of origins) {
    const host = hostnameFromUrl(origin);
    if (host) hosts.add(host);
  }
  const shopHost = hostnameFromUrl(appConfig.email?.shopUrl);
  if (shopHost) hosts.add(shopHost);
  return [...hosts];
}

function asTrimmed(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Parameter Builder may append a language token to IPs — never send that to CAPI. */
export function sanitizeMetaClientIp(value: string | null | undefined): string | undefined {
  const raw = asTrimmed(value);
  if (!raw) return undefined;
  if (isIP(raw)) return raw;
  const stripped = raw.replace(/\.[A-Za-z][A-Za-z0-9]{1,7}$/, '');
  return isIP(stripped) ? stripped : undefined;
}

/** Preserve original fbp/fbc casing. Never lowercase. */
export function sanitizeMetaClickId(value: string | null | undefined): string | undefined {
  const trimmed = asTrimmed(value);
  if (!trimmed || !META_CLICK_ID.test(trimmed)) return undefined;
  return trimmed;
}

function buildFbcFromFbclid(
  fbclid: string,
  existing?: { fbp?: string; fbc?: string },
): string | undefined {
  if (existing?.fbc) return existing.fbc;
  const cookies: Record<string, string> = {};
  if (existing?.fbp) cookies._fbp = existing.fbp;
  const builder = new ParamBuilder(metaParamBuilderDomains());
  builder.processRequest('localhost', { fbclid }, cookies);
  return sanitizeMetaClickId(builder.getFbc());
}

/**
 * Build fbc from fbclid when the browser cookie was not sent, without overwriting a valid fbc.
 * Never invent a new fbp — only preserve a browser-provided value.
 */
export function resolveExplicitMetaClickIds(explicit?: {
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
}): { fbp?: string; fbc?: string } {
  const fbp = sanitizeMetaClickId(explicit?.fbp);
  const existingFbc = sanitizeMetaClickId(explicit?.fbc);
  const fbclid = asTrimmed(explicit?.fbclid);
  const fbc =
    existingFbc ?? (fbclid ? buildFbcFromFbclid(fbclid, { ...(fbp ? { fbp } : {}) }) : undefined);
  return {
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
  };
}

/**
 * Normalize + SHA-256 hash via Meta's Parameter Builder.
 * Returns undefined for empty/invalid values so they are omitted from the payload.
 */
export function hashMetaPii(
  value: string | null | undefined,
  dataType: MetaPiiType,
): string | undefined {
  const trimmed = asTrimmed(value);
  if (!trimmed) return undefined;
  // Official hasher output is SHA-256 hex. Never hash that payload again.
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return trimmed.toLowerCase();
  const hashed = hasher.getNormalizedAndHashedPII(trimmed, dataType);
  if (typeof hashed !== 'string') return undefined;
  const result = hashed.trim();
  return result.length > 0 ? result : undefined;
}

export function formatMetaDateOfBirth(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
  return asTrimmed(String(value));
}

function cookieMap(req: Request): Record<string, string> {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  if (!cookies || typeof cookies !== 'object') return {};
  const mapped: Record<string, string> = {};
  for (const [key, raw] of Object.entries(cookies)) {
    if (typeof raw === 'string' && raw.trim()) mapped[key] = raw;
  }
  return mapped;
}

/**
 * Resolve fbc/fbp/IP from an Express request using Meta's Parameter Builder.
 * Prefers explicit browser-sent values and never overwrites a valid first-party cookie.
 * Does not emit a server-generated fbp (that would not match the Pixel cookie).
 */
export function extractMetaClickParams(
  req: Request,
  explicit?: {
    fbp?: string | null;
    fbc?: string | null;
    fbclid?: string | null;
  },
): MetaClickParams {
  try {
    const cookies = cookieMap(req);
    const fbp = sanitizeMetaClickId(explicit?.fbp) ?? sanitizeMetaClickId(cookies._fbp);
    const existingFbc = sanitizeMetaClickId(explicit?.fbc) ?? sanitizeMetaClickId(cookies._fbc);
    const fbclid =
      asTrimmed(explicit?.fbclid) ??
      asTrimmed(typeof req.query.fbclid === 'string' ? req.query.fbclid : undefined);

    const fbc =
      existingFbc ?? (fbclid ? buildFbcFromFbclid(fbclid, { ...(fbp ? { fbp } : {}) }) : undefined);

    const ipBuilder = new ParamBuilder(metaParamBuilderDomains());
    ipBuilder.processRequest(
      req.get('host') ?? '',
      fbclid ? { fbclid } : {},
      {
        ...(fbp ? { _fbp: fbp } : {}),
        ...(fbc ? { _fbc: fbc } : {}),
      },
      req.get('referer') ?? null,
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for']
        : null) ??
        (typeof req.headers['cf-connecting-ip'] === 'string'
          ? req.headers['cf-connecting-ip']
          : null),
      req.socket?.remoteAddress ?? req.ip ?? null,
    );

    const clientIp =
      sanitizeMetaClientIp(ipBuilder.getClientIpAddress()) ??
      sanitizeMetaClientIp(getClientIp(req)) ??
      sanitizeMetaClientIp(req.ip);

    return {
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(clientIp ? { clientIp } : {}),
    };
  } catch {
    const fbp = sanitizeMetaClickId(explicit?.fbp);
    const fbc = sanitizeMetaClickId(explicit?.fbc);
    const clientIp = sanitizeMetaClientIp(getClientIp(req)) ?? sanitizeMetaClientIp(req.ip);
    return {
      ...(fbp ? { fbp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(clientIp ? { clientIp } : {}),
    };
  }
}
