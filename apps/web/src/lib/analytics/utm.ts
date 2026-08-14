const UTM_STORAGE_KEY = '_fe_utm';

export type PersistedUtm = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  landingPath?: string | null;
  capturedAt?: string | null;
};

function readFromUrl(): PersistedUtm | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmTerm = params.get('utm_term');
    const utmContent = params.get('utm_content');
    if (!utmSource && !utmMedium && !utmCampaign && !utmTerm && !utmContent) return null;
    return {
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      landingPath: window.location.pathname,
      capturedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Capture first-touch UTM params for the session (survives SPA navigation). */
export function captureUtmParams(): PersistedUtm | null {
  const fromUrl = readFromUrl();
  if (fromUrl) {
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
    } catch {
      /* ignore */
    }
    return fromUrl;
  }

  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedUtm;
  } catch {
    return null;
  }
}

export function getPersistedUtm(): PersistedUtm | null {
  return captureUtmParams();
}
