import { getVisitorId } from './visitor-id';
import {
  getOrCreateSession,
  refreshIdleTimer,
  setupEngagementTracking,
  getEngagementMetrics,
  getLastSessionEndAt,
  returnBucket,
  markSessionEnded,
} from './session';
import {
  queuePageView,
  queueEvent,
  sendHeartbeat,
  setPendingVisitor,
  setPendingSession,
  buildVisitorPayload,
} from './collector';

let currentPath: string | null = null;
let pageEnterTime: number = Date.now();
let scrollDepth = 0;
let maxScrollDepth = 0;
let clickCount = 0;
let pageCount = 0;
let pageViewId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let isSetup = false;
let sessionStartEmitted = false;

function getScrollDepth(): number {
  const el = document.documentElement;
  if (!el) return 0;
  const scrolled = window.scrollY + window.innerHeight;
  const total = el.scrollHeight;
  if (total === 0) return 0;
  return Math.min(100, Math.round((scrolled / total) * 100));
}

function onScroll() {
  const depth = getScrollDepth();
  if (depth > scrollDepth) scrollDepth = depth;
  if (depth > maxScrollDepth) maxScrollDepth = depth;
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    // Flush current page metrics, but keep the session active — mobile browsers
    // fire this when switching apps briefly; ending the session here zeroes Live.
    commitCurrentPageView();
    pushSessionSnapshot(false);
    void import('./collector').then(({ flush }) => flush());
    return;
  }

  // Returning to the tab — ping Live immediately.
  const { sessionId } = getOrCreateSession();
  const visitorId = getVisitorId();
  sendHeartbeat(sessionId, visitorId, window.location.pathname);
  pushSessionSnapshot(false);
}

function onPageHide(event: PageTransitionEvent) {
  // bfcache (persisted) — user may come back; keep session live.
  if (event.persisted) {
    commitCurrentPageView();
    pushSessionSnapshot(false);
    return;
  }
  commitCurrentPageView(true);
  pushSessionSnapshot(true);
  markSessionEnded();
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target) return;
  clickCount++;
  const name = target.dataset.trackEvent;
  if (name) {
    const { sessionId } = getOrCreateSession();
    const visitorId = getVisitorId();
    queueEvent({
      eventId: crypto.randomUUID(),
      name,
      sessionId,
      visitorId,
      path: window.location.pathname,
      properties: {
        label: target.dataset.trackLabel ?? target.textContent?.slice(0, 100) ?? null,
        tag: target.tagName.toLowerCase(),
      },
      occurredAt: new Date().toISOString(),
    });
  }
}

function pushSessionSnapshot(ending: boolean) {
  const { sessionId, startedAt } = getOrCreateSession();
  const visitorId = getVisitorId();
  const engagement = getEngagementMetrics();
  const avgTimePerPageMs = pageCount > 0 ? Math.round(engagement.durationMs / pageCount) : null;

  setPendingSession({
    sessionId,
    visitorId,
    startedAt: startedAt.toISOString(),
    pageCount,
    clickCount,
    maxScrollDepth,
    activeMs: engagement.activeMs,
    idleMs: engagement.idleMs,
    durationMs: engagement.durationMs,
    avgTimePerPageMs,
    exitPage: currentPath,
    lastPage: currentPath,
    ...(ending ? { endedAt: new Date().toISOString(), isActive: false } : { isActive: true }),
  });
}

function commitCurrentPageView(isFinal = false) {
  if (!currentPath || !pageViewId) return;
  const timeOnPageMs = Date.now() - pageEnterTime;
  const { sessionId } = getOrCreateSession();
  const visitorId = getVisitorId();

  const view = {
    sessionId,
    visitorId,
    path: currentPath,
    title: document.title ?? null,
    viewedAt: new Date(pageEnterTime).toISOString(),
    timeOnPageMs,
    scrollDepth,
    isEntry: pageCount === 1,
    isExit: isFinal,
  };

  queuePageView(view);

  if (!isFinal) {
    pageViewId = null;
    scrollDepth = 0;
  }
}

function emitSessionStartIfNeeded(sessionId: string, visitorId: string, isNew: boolean) {
  if (sessionStartEmitted || !isNew) return;
  sessionStartEmitted = true;

  const lastEnd = getLastSessionEndAt();
  const returnAfterMs = lastEnd ? Date.now() - lastEnd : -1;
  const bucket = returnBucket(returnAfterMs);

  queueEvent({
    eventId: crypto.randomUUID(),
    name: 'session_start',
    sessionId,
    visitorId,
    path: window.location.pathname,
    properties: {
      returnAfterMs: returnAfterMs >= 0 ? returnAfterMs : null,
      returnBucket: bucket,
    },
    occurredAt: new Date().toISOString(),
  });
}

export function trackRouteChange(newPath: string) {
  if (newPath === currentPath) return;

  if (currentPath) {
    commitCurrentPageView(false);
  }

  currentPath = newPath;
  pageEnterTime = Date.now();
  scrollDepth = 0;
  pageViewId = crypto.randomUUID();
  pageCount++;

  const { sessionId, startedAt, isNew } = getOrCreateSession();
  const visitorId = getVisitorId();

  if (isNew) {
    sessionStartEmitted = false;
    emitSessionStartIfNeeded(sessionId, visitorId, true);
  }

  if (isNew || pageCount === 1) {
    setPendingVisitor(buildVisitorPayload(visitorId));
  }

  pushSessionSnapshot(false);
  if (pageCount === 1) {
    setPendingSession({
      sessionId,
      visitorId,
      startedAt: startedAt.toISOString(),
      entryPage: newPath,
    });
  }

  refreshIdleTimer(() => {
    commitCurrentPageView(true);
    pushSessionSnapshot(true);
  });
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const { sessionId } = getOrCreateSession();
  const visitorId = getVisitorId();

  queueEvent({
    eventId: crypto.randomUUID(),
    name,
    sessionId,
    visitorId,
    path: window.location.pathname,
    properties: properties ?? {},
    occurredAt: new Date().toISOString(),
  });
}

export function setup() {
  if (isSetup || typeof window === 'undefined') return;
  isSetup = true;

  setupEngagementTracking();

  document.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('click', onDocumentClick, { capture: true });
  // pagehide is more reliable than beforeunload on mobile Safari/Chrome.
  window.addEventListener('pagehide', onPageHide);

  // 15s keeps Live accurate on mobile where timers are throttled in background.
  heartbeatInterval = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    const { sessionId } = getOrCreateSession();
    const visitorId = getVisitorId();
    sendHeartbeat(sessionId, visitorId, window.location.pathname);
    pushSessionSnapshot(false);
  }, 15_000);

  // First heartbeat right away so Active Now isn't empty for ~30s after landing.
  const { sessionId } = getOrCreateSession();
  const visitorId = getVisitorId();
  sendHeartbeat(sessionId, visitorId, window.location.pathname);
}

export function teardown() {
  if (!isSetup) return;
  isSetup = false;

  document.removeEventListener('scroll', onScroll);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('click', onDocumentClick, { capture: true });
  window.removeEventListener('pagehide', onPageHide);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
