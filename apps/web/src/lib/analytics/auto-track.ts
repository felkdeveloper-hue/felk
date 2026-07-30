import { getVisitorId } from './visitor-id';
import { getOrCreateSession, refreshIdleTimer } from './session';
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
let clickCount = 0;
let pageCount = 0;
let pageViewId: string | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let isSetup = false;

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
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    commitCurrentPageView();
  }
}

function onBeforeUnload() {
  commitCurrentPageView(true);
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

export function trackRouteChange(newPath: string) {
  if (newPath === currentPath) return;

  // Close previous page view
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

  if (isNew || pageCount === 1) {
    setPendingVisitor(buildVisitorPayload(visitorId));
    setPendingSession({
      sessionId,
      visitorId,
      startedAt: startedAt.toISOString(),
      entryPage: newPath,
      pageCount,
    });
  } else {
    setPendingSession({
      sessionId,
      visitorId,
      pageCount,
      clickCount,
      maxScrollDepth: scrollDepth,
    });
  }

  refreshIdleTimer(() => {
    commitCurrentPageView(true);
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

  document.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('click', onDocumentClick, { capture: true });
  window.addEventListener('beforeunload', onBeforeUnload);

  // Heartbeat every 30s
  heartbeatInterval = setInterval(() => {
    const { sessionId } = getOrCreateSession();
    const visitorId = getVisitorId();
    sendHeartbeat(sessionId, visitorId);

    setPendingSession({
      sessionId,
      visitorId,
      pageCount,
      clickCount,
      maxScrollDepth: scrollDepth,
    });
  }, 30_000);
}

export function teardown() {
  if (!isSetup) return;
  isSetup = false;

  document.removeEventListener('scroll', onScroll);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('click', onDocumentClick, { capture: true });
  window.removeEventListener('beforeunload', onBeforeUnload);

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}
