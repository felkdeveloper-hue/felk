/**
 * Human-readable traffic attribution for admin analytics.
 * Uses referrer, UTM params, and classified traffic source together.
 */
export interface AttributionDisplay {
  /** Primary label, e.g. "Google Ads", "ChatGPT", "Instagram" */
  label: string;
  /** Channel grouping, e.g. "Paid search", "AI referral", "Social" */
  channel: string;
  /** Extra context: campaign name, referrer host, medium, etc. */
  detail?: string | null;
}

const AI_REFERRERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /chatgpt\.com|chat\.openai\.com/i, label: 'ChatGPT' },
  { pattern: /perplexity\.ai/i, label: 'Perplexity' },
  { pattern: /claude\.ai|anthropic\.com/i, label: 'Claude' },
  { pattern: /gemini\.google\.com|bard\.google\.com/i, label: 'Google Gemini' },
  { pattern: /copilot\.microsoft\.com|bing\.com\/chat/i, label: 'Microsoft Copilot' },
  { pattern: /you\.com/i, label: 'You.com' },
];

const SEARCH_ENGINES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /google\./i, label: 'Google Search' },
  { pattern: /bing\./i, label: 'Bing Search' },
  { pattern: /yahoo\./i, label: 'Yahoo Search' },
  { pattern: /duckduckgo\./i, label: 'DuckDuckGo' },
];

const SOCIAL_PLATFORMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /facebook\.com|fb\.com|l\.facebook\.com/i, label: 'Facebook' },
  { pattern: /instagram\.com/i, label: 'Instagram' },
  { pattern: /tiktok\.com/i, label: 'TikTok' },
  { pattern: /twitter\.com|t\.co|x\.com/i, label: 'X (Twitter)' },
  { pattern: /linkedin\.com|lnkd\.in/i, label: 'LinkedIn' },
  { pattern: /pinterest\.com|pin\.it/i, label: 'Pinterest' },
  { pattern: /youtube\.com|youtu\.be/i, label: 'YouTube' },
  { pattern: /whatsapp\.com|wa\.me/i, label: 'WhatsApp' },
  { pattern: /telegram\.org|t\.me/i, label: 'Telegram' },
  { pattern: /reddit\.com/i, label: 'Reddit' },
];

/** UTM / campaign aliases — `ig` and `instagram` are the same source. */
const SOURCE_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^(ig|insta|instagram)$/i, label: 'Instagram' },
  { pattern: /^(fb|facebook|meta)$/i, label: 'Facebook' },
  { pattern: /^(tt|tiktok)$/i, label: 'TikTok' },
  { pattern: /^(yt|youtube)$/i, label: 'YouTube' },
  { pattern: /^(wa|whatsapp)$/i, label: 'WhatsApp' },
  { pattern: /^(x|twitter)$/i, label: 'X (Twitter)' },
  { pattern: /^(li|linkedin)$/i, label: 'LinkedIn' },
  { pattern: /^(pin|pinterest)$/i, label: 'Pinterest' },
  { pattern: /^(google|gads|adwords)$/i, label: 'Google' },
];

function canonicalSourceLabel(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const alias = matchList(raw, SOURCE_ALIASES);
  if (alias) return alias;
  const fromHost = matchList(raw, SOCIAL_PLATFORMS) ?? matchList(raw, SEARCH_ENGINES);
  return fromHost;
}

const AD_PLATFORMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /google|adwords|gads/i, label: 'Google Ads' },
  { pattern: /facebook|instagram|meta/i, label: 'Meta Ads' },
  { pattern: /tiktok/i, label: 'TikTok Ads' },
  { pattern: /bing|microsoft/i, label: 'Microsoft Ads' },
];

/** Checkout / payment hosts — returning from these is not how the visitor found the site. */
const IGNORED_REFERRER_HOSTS = [
  /mintpay\.lk/i,
  /payhere\.lk/i,
  /paykoko\.com/i,
  /\bkoko\.lk\b/i,
  /paypal\.com/i,
  /stripe\.com/i,
  /checkout\.stripe\.com/i,
  /webxpay\.com/i,
  /genie\.lk/i,
  /fe\.lk$/i,
];

function normalizeHost(referrer: string | null | undefined): string | null {
  if (!referrer?.trim()) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** True when the referrer is a payment gateway or our own store — ignore for acquisition. */
export function isIgnoredReferrer(referrer: string | null | undefined): boolean {
  const host = normalizeHost(referrer);
  if (!host) return false;
  return IGNORED_REFERRER_HOSTS.some((pattern) => pattern.test(host));
}

function acquisitionHost(referrer: string | null | undefined): string | null {
  if (isIgnoredReferrer(referrer)) return null;
  return normalizeHost(referrer);
}

function matchList(value: string, list: Array<{ pattern: RegExp; label: string }>): string | null {
  for (const item of list) {
    if (item.pattern.test(value)) return item.label;
  }
  return null;
}

function isPaidMedium(medium: string | null | undefined): boolean {
  if (!medium) return false;
  const m = medium.toLowerCase();
  return m === 'cpc' || m === 'ppc' || m === 'paid' || m === 'paid_social' || m === 'display';
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
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

  if (isPaidMedium(utmMedium)) return 'paid_search';
  if (utmMedium?.toLowerCase() === 'email') return 'email';
  if (utmMedium?.toLowerCase() === 'social') return 'social';
  if (utmMedium?.toLowerCase() === 'affiliate') return 'referral';
  if (utmMedium?.toLowerCase() === 'display') return 'display';

  const refHost = acquisitionHost(referrer);
  if (refHost) {
    if (matchList(refHost, AI_REFERRERS)) return 'referral';
    if (matchList(refHost, SEARCH_ENGINES)) return 'organic_search';
    if (matchList(refHost, SOCIAL_PLATFORMS)) return 'social';
    return 'referral';
  }

  if (utmSource) {
    const s = utmSource.toLowerCase();
    const canonical = canonicalSourceLabel(s);
    if (
      canonical === 'Instagram' ||
      canonical === 'Facebook' ||
      canonical === 'TikTok' ||
      canonical === 'YouTube' ||
      canonical === 'WhatsApp' ||
      canonical === 'X (Twitter)' ||
      canonical === 'LinkedIn' ||
      canonical === 'Pinterest'
    ) {
      return isPaidMedium(utmMedium) ? 'paid_search' : 'social';
    }
    if (/google|bing|yahoo|duckduckgo/.test(s)) return 'organic_search';
    if (/facebook|instagram|twitter|linkedin|tiktok|pinterest|youtube|meta/.test(s)) {
      return isPaidMedium(utmMedium) ? 'paid_search' : 'social';
    }
    if (s === 'email') return 'email';
  }

  return 'direct';
}

/** Build a professional label for admin tables. */
export function formatAttribution(opts: {
  trafficSource: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): AttributionDisplay {
  const { trafficSource, referrer, utmSource, utmMedium, utmCampaign } = opts;
  const refHost = acquisitionHost(referrer);
  const utmSourceNorm = utmSource?.trim() ?? '';
  const utmMediumNorm = utmMedium?.trim() ?? '';
  const campaign = utmCampaign?.trim() || null;
  const canonicalUtm = canonicalSourceLabel(utmSourceNorm);

  // Paid ads (UTM takes priority)
  if (
    isPaidMedium(utmMediumNorm) ||
    trafficSource === 'paid_search' ||
    trafficSource === 'display'
  ) {
    const adLabel =
      matchList(`${utmSourceNorm} ${utmMediumNorm}`, AD_PLATFORMS) ??
      canonicalUtm ??
      (utmSourceNorm ? titleCase(utmSourceNorm) : 'Paid ads');
    return {
      label: adLabel,
      channel: trafficSource === 'display' ? 'Display ads' : 'Paid ads',
      detail: campaign ?? (utmMediumNorm || null),
    };
  }

  // Email
  if (
    trafficSource === 'email' ||
    utmMediumNorm.toLowerCase() === 'email' ||
    utmSourceNorm.toLowerCase() === 'email'
  ) {
    return {
      label: 'Email',
      channel: 'Email',
      detail: campaign || utmSourceNorm || null,
    };
  }

  // AI referrals
  if (refHost) {
    const aiLabel = matchList(refHost, AI_REFERRERS);
    if (aiLabel) {
      return { label: aiLabel, channel: 'AI referral', detail: refHost };
    }
  }

  // Social (referrer or utm)
  if (refHost) {
    const socialLabel = matchList(refHost, SOCIAL_PLATFORMS);
    if (socialLabel) {
      return {
        label: socialLabel,
        channel: utmMediumNorm.toLowerCase() === 'social' ? 'Social (tagged)' : 'Social',
        detail: campaign ?? refHost,
      };
    }
  }
  if (trafficSource === 'social' && utmSourceNorm) {
    return {
      label: canonicalUtm ?? titleCase(utmSourceNorm),
      channel: 'Social',
      detail: campaign || utmMediumNorm || null,
    };
  }

  // Organic search
  if (refHost) {
    const searchLabel = matchList(refHost, SEARCH_ENGINES);
    if (searchLabel) {
      return { label: searchLabel, channel: 'Organic search', detail: refHost };
    }
  }
  if (trafficSource === 'organic_search') {
    const label = canonicalUtm ?? (utmSourceNorm ? titleCase(utmSourceNorm) : 'Organic search');
    return { label, channel: 'Organic search', detail: campaign || utmMediumNorm || null };
  }

  // Shared / referral link
  if (refHost) {
    return {
      label: `Referral · ${refHost}`,
      channel: 'Referral',
      detail: campaign || utmSourceNorm || null,
    };
  }

  if (utmSourceNorm) {
    return {
      label: canonicalUtm ?? titleCase(utmSourceNorm),
      channel: titleCase(trafficSource.replace(/_/g, ' ')),
      detail: campaign || utmMediumNorm || null,
    };
  }

  // Direct — typed URL, bookmark, or app open with no referrer
  return {
    label: 'Direct',
    channel: 'Direct visit',
    detail: 'Typed URL, bookmark, or app',
  };
}
