import type { DeviceData } from '@/models/analytics/index.js';

/**
 * Lightweight user-agent parser — no external dependency.
 * Covers the dominant browser/OS/device combinations.
 */
export function parseUserAgent(
  ua: string | undefined,
): Omit<DeviceData, 'screenResolution' | 'language'> {
  if (!ua) {
    return { type: 'unknown', os: null, osVersion: null, browser: null, browserVersion: null };
  }

  const deviceType = detectDeviceType(ua);
  const { browser, browserVersion } = detectBrowser(ua);
  const { os, osVersion } = detectOs(ua);

  return { type: deviceType, os, osVersion, browser, browserVersion };
}

function detectDeviceType(ua: string): DeviceData['type'] {
  const lower = ua.toLowerCase();
  if (/ipad|android(?!.*mobile)|tablet/i.test(lower)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/i.test(lower))
    return 'mobile';
  return 'desktop';
}

function detectBrowser(ua: string): { browser: string | null; browserVersion: string | null } {
  const browsers: Array<{ name: string; pattern: RegExp; versionPattern: RegExp }> = [
    { name: 'Edge', pattern: /Edg\//i, versionPattern: /Edg\/([^\s;]+)/i },
    {
      name: 'Chrome',
      pattern: /Chrome\/[^\s]+\s+(?!.*Chromium)/i,
      versionPattern: /Chrome\/([^\s;]+)/i,
    },
    { name: 'Firefox', pattern: /Firefox\//i, versionPattern: /Firefox\/([^\s;]+)/i },
    {
      name: 'Safari',
      pattern: /Safari\/[^\s]+.*Version\//i,
      versionPattern: /Version\/([^\s;]+)/i,
    },
    { name: 'Opera', pattern: /OPR\/|Opera\//i, versionPattern: /(?:OPR|Opera)\/([^\s;]+)/i },
    { name: 'Samsung', pattern: /SamsungBrowser\//i, versionPattern: /SamsungBrowser\/([^\s;]+)/i },
    { name: 'IE', pattern: /MSIE |Trident\//i, versionPattern: /(?:MSIE |rv:)([^\s;)]+)/i },
  ];

  for (const b of browsers) {
    if (b.pattern.test(ua)) {
      const vMatch = ua.match(b.versionPattern);
      return { browser: b.name, browserVersion: vMatch ? (vMatch[1] ?? null) : null };
    }
  }
  return { browser: null, browserVersion: null };
}

function detectOs(ua: string): { os: string | null; osVersion: string | null } {
  const osList: Array<{ name: string; pattern: RegExp; versionPattern?: RegExp }> = [
    { name: 'Windows', pattern: /Windows NT/i, versionPattern: /Windows NT ([^\s;)]+)/i },
    { name: 'macOS', pattern: /Mac OS X/i, versionPattern: /Mac OS X ([^\s;)]+)/i },
    { name: 'iOS', pattern: /iPhone|iPad|iPod/i, versionPattern: /OS ([^\s;)]+)/i },
    { name: 'Android', pattern: /Android/i, versionPattern: /Android ([^\s;)]+)/i },
    { name: 'Linux', pattern: /Linux/i },
    { name: 'ChromeOS', pattern: /CrOS/i },
  ];

  for (const o of osList) {
    if (o.pattern.test(ua)) {
      const vMatch = o.versionPattern ? ua.match(o.versionPattern) : null;
      return {
        os: o.name,
        osVersion: vMatch ? (vMatch[1]?.replace(/_/g, '.') ?? null) : null,
      };
    }
  }
  return { os: null, osVersion: null };
}

/**
 * Classify traffic source from referrer + UTM params.
 */
export function classifyTrafficSource(opts: {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): string {
  const { referrer, utmSource, utmMedium } = opts;

  if (utmMedium) {
    const m = utmMedium.toLowerCase();
    if (m === 'cpc' || m === 'ppc' || m === 'paid') return 'paid_search';
    if (m === 'email') return 'email';
    if (m === 'social') return 'social';
    if (m === 'affiliate') return 'referral';
    if (m === 'display') return 'display';
  }

  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (/google|bing|yahoo|duckduckgo/.test(s)) return 'organic_search';
    if (/facebook|instagram|twitter|linkedin|tiktok|pinterest|youtube/.test(s)) return 'social';
    if (s === 'email') return 'email';
  }

  if (!referrer) return 'direct';

  try {
    const url = new URL(referrer);
    const host = url.hostname.replace(/^www\./, '');
    if (/google\.|bing\.|yahoo\.|duckduckgo\./.test(host)) return 'organic_search';
    if (
      /facebook\.|instagram\.|twitter\.|t\.co|linkedin\.|tiktok\.|pinterest\.|youtube\./.test(host)
    )
      return 'social';
    return 'referral';
  } catch {
    return 'direct';
  }
}
