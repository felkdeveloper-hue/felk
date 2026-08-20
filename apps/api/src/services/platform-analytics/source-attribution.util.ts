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
  /vercel\.com/i,
  /vercel\.app/i,
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
  const m = medium.toLowerCase().replace(/-/g, '_');
  return (
    m === 'cpc' ||
    m === 'ppc' ||
    m === 'paid' ||
    m === 'paid_social' ||
    m === 'paidsocial' ||
    m === 'display' ||
    m === 'cpm'
  );
}

export type AttributionSignals = {
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  igshid?: string | null;
  inAppSource?: string | null;
};

function hasClickId(opts: AttributionSignals): boolean {
  return Boolean(opts.fbclid || opts.gclid || opts.ttclid || opts.msclkid);
}

export function hasAttributionSignal(opts: AttributionSignals): boolean {
  const referrer = opts.referrer?.trim() || null;
  const meaningfulReferrer = Boolean(referrer) && !isIgnoredReferrer(referrer);
  return Boolean(
    opts.utmSource?.trim() ||
    opts.utmMedium?.trim() ||
    opts.utmCampaign?.trim() ||
    hasClickId(opts) ||
    opts.igshid?.trim() ||
    meaningfulReferrer,
  );
}

function looksLikeInstagram(value?: string | null): boolean {
  const v = (value ?? '').toLowerCase();
  return /instagram|\binsta\b|(?:^|[^a-z0-9])ig(?:[^a-z0-9]|$)/i.test(v);
}

function isInstagramSignal(opts: AttributionSignals): boolean {
  if ((opts.inAppSource ?? '').toLowerCase() === 'instagram') return true;
  if (opts.igshid?.trim()) return true;
  const source = (opts.utmSource ?? '').trim();
  if (canonicalSourceLabel(source) === 'Instagram') return true;
  if (
    looksLikeInstagram(opts.utmCampaign) ||
    looksLikeInstagram(opts.utmContent) ||
    looksLikeInstagram(opts.utmMedium)
  ) {
    return true;
  }
  const host = acquisitionHost(opts.referrer);
  return Boolean(host && /instagram\.com/i.test(host));
}

function isFacebookSignal(opts: AttributionSignals): boolean {
  if (isInstagramSignal(opts)) return false;
  if ((opts.inAppSource ?? '').toLowerCase() === 'facebook') return true;
  const source = (opts.utmSource ?? '').trim();
  if (canonicalSourceLabel(source) === 'Facebook') return true;
  if (opts.fbclid?.trim()) return true;
  const host = acquisitionHost(opts.referrer);
  return Boolean(host && /facebook\.com|fb\.com|fb\.me/i.test(host));
}

/** Instagram / Facebook / TikTok in-app browsers — used when ads only send fbclid. */
export function detectInAppSource(ua?: string | null): string | null {
  if (!ua) return null;
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) return 'facebook';
  if (/TikTok|BytedanceWebview|musical_ly/i.test(ua)) return 'tiktok';
  return null;
}

function isOrganicSocialTagged(opts: AttributionSignals): boolean {
  const medium = (opts.utmMedium ?? '').trim().toLowerCase();
  const content = (opts.utmContent ?? '').trim().toLowerCase();
  return (
    medium === 'social' ||
    medium === 'organic' ||
    medium === 'bio' ||
    /link[_-]?in[_-]?bio/.test(content)
  );
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
 * Classify traffic source from referrer, UTM params, and ad click IDs.
 */
export function classifyTrafficSource(opts: AttributionSignals): string {
  const { referrer, utmSource, utmMedium } = opts;

  if (opts.gclid || opts.msclkid) return 'paid_search';

  if (isPaidMedium(utmMedium)) {
    if (isInstagramSignal(opts) || isFacebookSignal(opts) || opts.ttclid) return 'paid_social';
    return 'paid_search';
  }

  if (utmMedium?.toLowerCase() === 'email') return 'email';
  if (isOrganicSocialTagged(opts)) return 'social';
  if (utmMedium?.toLowerCase() === 'affiliate') return 'referral';
  if (utmMedium?.toLowerCase() === 'display') return 'display';

  if (opts.fbclid || opts.ttclid) return 'paid_social';

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
      return isPaidMedium(utmMedium) ? 'paid_social' : 'social';
    }
    if (/google|bing|yahoo|duckduckgo/.test(s)) return 'organic_search';
    if (s === 'email') return 'email';
  }

  return 'direct';
}

/** Keep the first non-direct source; Direct never overwrites ads/social. */
export function pickFirstTouchAttribution<T extends AttributionSignals>(
  existing: T | null | undefined,
  incoming: T,
): T {
  const incomingHasSignal = hasAttributionSignal(incoming);
  const incomingSource = classifyTrafficSource(incoming);
  const existingSource = existing ? classifyTrafficSource(existing) : 'direct';
  const existingIsDirect =
    !existing || existingSource === 'direct' || !hasAttributionSignal(existing);

  if (!incomingHasSignal || incomingSource === 'direct') {
    return (existing ?? incoming) as T;
  }
  if (existingIsDirect) return incoming;
  return existing as T;
}

/** Build a professional label for admin tables. */
export function formatAttribution(opts: {
  trafficSource: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  igshid?: string | null;
  inAppSource?: string | null;
}): AttributionDisplay {
  const { trafficSource, referrer, utmSource, utmMedium, utmCampaign } = opts;
  const refHost = acquisitionHost(referrer);
  const utmSourceNorm = utmSource?.trim() ?? '';
  const utmMediumNorm = utmMedium?.trim() ?? '';
  const campaign = utmCampaign?.trim() || null;
  const content = opts.utmContent?.trim() || null;
  const canonicalUtm = canonicalSourceLabel(utmSourceNorm);
  const organicSocial = isOrganicSocialTagged(opts);
  const paid =
    !organicSocial &&
    (isPaidMedium(utmMediumNorm) ||
      trafficSource === 'paid_search' ||
      trafficSource === 'paid_social' ||
      trafficSource === 'display' ||
      Boolean(opts.fbclid || opts.gclid || opts.ttclid || opts.msclkid));

  if (paid) {
    if (isInstagramSignal(opts)) {
      return {
        label: 'Instagram Ads',
        channel: 'Paid social',
        detail: campaign ?? content ?? 'Instagram',
      };
    }
    if (isFacebookSignal(opts) || opts.fbclid) {
      return {
        label: 'Facebook Ads',
        channel: 'Paid social',
        detail: campaign ?? content ?? 'Facebook',
      };
    }
    if (opts.ttclid || canonicalUtm === 'TikTok') {
      return { label: 'TikTok Ads', channel: 'Paid social', detail: campaign };
    }
    if (opts.gclid || canonicalUtm === 'Google') {
      return { label: 'Google Ads', channel: 'Paid search', detail: campaign };
    }
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
