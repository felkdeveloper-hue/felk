/**
 * Lightweight bot / crawler / health-check detection for analytics ingest.
 * Conservative — prefer keeping legitimate users over aggressive filtering.
 */

const BOT_UA_PATTERNS: RegExp[] = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /bingpreview/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora link preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest\/0\./i,
  /pinterestbot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /googlebot/i,
  /google-inspectiontool/i,
  /adsbot-google/i,
  /mediapartners-google/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /wget\b/i,
  /curl\b/i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /httpclient/i,
  /okhttp/i,
  /scrapy/i,
  /uptime/i,
  /pingdom/i,
  /statuscake/i,
  /healthcheck/i,
  /kube-probe/i,
  /google-site-verification/i,
  /preview\.page\.site/i,
];

/** Paths that should never create analytics landings (probes / assets). */
const SKIP_PATH_PATTERNS: RegExp[] = [
  /^\/health(?:z|check)?$/i,
  /^\/readyz?$/i,
  /^\/livez?$/i,
  /^\/favicon\.ico$/i,
  /^\/robots\.txt$/i,
  /^\/sitemap.*\.xml$/i,
  /^\/\.well-known\//i,
];

export interface BotFilterResult {
  exclude: boolean;
  reason: string | null;
}

export function evaluateAnalyticsBotFilter(opts: {
  userAgent?: string | null;
  path?: string | null;
  enabled?: boolean;
}): BotFilterResult {
  if (opts.enabled === false) {
    return { exclude: false, reason: null };
  }

  const ua = opts.userAgent?.trim() ?? '';
  if (!ua) {
    return { exclude: true, reason: 'empty_user_agent' };
  }

  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return { exclude: true, reason: `ua:${pattern.source}` };
    }
  }

  const path = opts.path?.split('?')[0] ?? '';
  if (path) {
    for (const pattern of SKIP_PATH_PATTERNS) {
      if (pattern.test(path)) {
        return { exclude: true, reason: `path:${pattern.source}` };
      }
    }
  }

  return { exclude: false, reason: null };
}
