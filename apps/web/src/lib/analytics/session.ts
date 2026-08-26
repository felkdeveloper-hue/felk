const SESSION_ID_KEY = '_fe_sid';
const SESSION_START_KEY = '_fe_ss';
const LAST_SESSION_END_KEY = '_fe_lse';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes — rotate session
const ACTIVITY_IDLE_MS = 30_000; // 30s without interaction = idle for engagement

let sessionId: string | null = null;
let sessionStartedAt: number | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

/** Engagement clocks */
let activeMs = 0;
let idleMs = 0;
let lastTickAt = Date.now();
let isIdle = false;
let activityIdleTimer: ReturnType<typeof setTimeout> | null = null;
let engagementSetup = false;

function persistSession(id: string, startedAt: number) {
  try {
    sessionStorage.setItem(SESSION_ID_KEY, id);
    sessionStorage.setItem(SESSION_START_KEY, String(startedAt));
  } catch {
    /* private browsing */
  }
}

function loadSession(): { id: string; startedAt: number } | null {
  try {
    const id = sessionStorage.getItem(SESSION_ID_KEY);
    const startedAt = sessionStorage.getItem(SESSION_START_KEY);
    if (id && startedAt) return { id, startedAt: Number(startedAt) };
  } catch {
    /* ignore */
  }
  return null;
}

function tickEngagement() {
  const now = Date.now();
  const delta = Math.max(0, now - lastTickAt);
  lastTickAt = now;
  if (document.visibilityState === 'hidden' || isIdle) {
    idleMs += delta;
  } else {
    activeMs += delta;
  }
}

function markActive() {
  tickEngagement();
  isIdle = false;
  if (activityIdleTimer) clearTimeout(activityIdleTimer);
  activityIdleTimer = setTimeout(() => {
    tickEngagement();
    isIdle = true;
  }, ACTIVITY_IDLE_MS);
}

export function setupEngagementTracking() {
  if (engagementSetup || typeof window === 'undefined') return;
  engagementSetup = true;
  lastTickAt = Date.now();
  const events: Array<keyof DocumentEventMap> = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
  ];
  const handler = () => markActive();
  for (const ev of events) {
    document.addEventListener(ev, handler, { passive: true, capture: true });
  }
  document.addEventListener('visibilitychange', () => {
    tickEngagement();
    if (document.visibilityState === 'visible') markActive();
  });
  markActive();
}

export function getEngagementMetrics() {
  tickEngagement();
  const started = sessionStartedAt ?? Date.now();
  const durationMs = Math.max(0, Date.now() - started);
  return { activeMs, idleMs, durationMs };
}

export function resetEngagementMetrics() {
  activeMs = 0;
  idleMs = 0;
  lastTickAt = Date.now();
  isIdle = false;
}

export function getLastSessionEndAt(): number | null {
  try {
    const v = localStorage.getItem(LAST_SESSION_END_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function markSessionEnded() {
  try {
    localStorage.setItem(LAST_SESSION_END_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function returnBucket(gapMs: number): '1h' | '1d' | '7d' | '30d' | 'new' | 'same' {
  if (gapMs < 0) return 'new';
  if (gapMs < 60 * 60 * 1000) return 'same';
  if (gapMs < 24 * 60 * 60 * 1000) return '1h';
  if (gapMs < 7 * 24 * 60 * 60 * 1000) return '1d';
  if (gapMs < 30 * 24 * 60 * 60 * 1000) return '7d';
  return '30d';
}

/** Start a fresh session (new ad click in the same tab, or idle timeout). */
export function startNewSession(): { sessionId: string; startedAt: Date; isNew: boolean } {
  sessionId = null;
  sessionStartedAt = null;
  resetEngagementMetrics();
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_START_KEY);
  } catch {
    /* ignore */
  }
  return getOrCreateSession();
}

export function getOrCreateSession(): { sessionId: string; startedAt: Date; isNew: boolean } {
  if (sessionId) return { sessionId, startedAt: new Date(sessionStartedAt!), isNew: false };

  const existing = loadSession();
  if (existing) {
    sessionId = existing.id;
    sessionStartedAt = existing.startedAt;
    return { sessionId, startedAt: new Date(sessionStartedAt), isNew: false };
  }

  sessionId = crypto.randomUUID();
  sessionStartedAt = Date.now();
  persistSession(sessionId, sessionStartedAt);
  resetEngagementMetrics();
  return { sessionId, startedAt: new Date(sessionStartedAt), isNew: true };
}

export function refreshIdleTimer(onExpire: () => void) {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    onExpire();
    markSessionEnded();
    sessionId = null;
    sessionStartedAt = null;
    resetEngagementMetrics();
    try {
      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_START_KEY);
    } catch {
      /* ignore */
    }
  }, IDLE_TIMEOUT_MS);
}

export function getSessionId(): string | null {
  return sessionId;
}
