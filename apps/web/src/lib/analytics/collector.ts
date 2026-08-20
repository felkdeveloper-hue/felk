import { captureAttribution } from './attribution';
import { useAuthStore } from '@/store/auth-store';

const ENDPOINT = `${import.meta.env.VITE_API_URL ?? '/api/v1'}/analytics/collect`;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_QUEUE_SIZE = 50;

interface PageViewItem {
  sessionId: string;
  visitorId: string;
  path: string;
  title?: string | null;
  referrer?: string | null;
  viewedAt: string;
  timeOnPageMs?: number | null;
  scrollDepth?: number;
  isEntry?: boolean;
  isExit?: boolean;
}

interface EventItem {
  eventId: string;
  name: string;
  sessionId?: string | null;
  visitorId?: string | null;
  path?: string | null;
  properties?: Record<string, unknown>;
  occurredAt: string;
}

interface VisitorPayload {
  visitorId: string;
  geo?: Record<string, string | null>;
  device?: {
    type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    screenResolution?: string | null;
    language?: string | null;
  };
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
  ttclid?: string | null;
  msclkid?: string | null;
  igshid?: string | null;
  inAppSource?: string | null;
  landingPath?: string | null;
}

export interface SessionPayload {
  sessionId: string;
  visitorId: string;
  startedAt?: string;
  entryPage?: string | null;
  exitPage?: string | null;
  lastPage?: string | null;
  pageCount?: number;
  clickCount?: number;
  maxScrollDepth?: number;
  activeMs?: number;
  idleMs?: number;
  durationMs?: number;
  avgTimePerPageMs?: number | null;
  endedAt?: string | null;
  isActive?: boolean;
}

interface CollectPayload {
  visitor?: VisitorPayload;
  session?: SessionPayload;
  pageViews?: PageViewItem[];
  events?: EventItem[];
  heartbeat?: { sessionId: string; visitorId: string; path?: string };
}

let pageViewQueue: PageViewItem[] = [];
let eventQueue: EventItem[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let pendingVisitor: VisitorPayload | null = null;
let pendingSession: SessionPayload | null = null;

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|android(?!.*mobile)|tablet/.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|windows phone/.test(ua)) return 'mobile';
  if (ua.length > 0) return 'desktop';
  return 'unknown';
}

async function send(payload: CollectPayload): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = useAuthStore.getState().accessToken;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* store not ready */
  }
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body,
      keepalive: true,
      credentials: 'include',
    });
    return;
  } catch {
    /* fall through to beacon */
  }
  if (navigator.sendBeacon && !headers.Authorization) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(ENDPOINT, blob);
  }
}

export function queuePageView(item: PageViewItem): void {
  pageViewQueue.push(item);
  if (pageViewQueue.length >= MAX_QUEUE_SIZE) {
    void flush();
  }
}

export function queueEvent(item: EventItem): void {
  eventQueue.push(item);
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    void flush();
  }
}

export function setPendingVisitor(v: VisitorPayload): void {
  pendingVisitor = v;
}

export function setPendingSession(s: SessionPayload): void {
  pendingSession = { ...pendingSession, ...s };
}

export async function flush(): Promise<void> {
  const views = pageViewQueue.splice(0, pageViewQueue.length);
  const evts = eventQueue.splice(0, eventQueue.length);
  const visitor = pendingVisitor;
  const session = pendingSession;
  pendingVisitor = null;
  pendingSession = null;

  if (!views.length && !evts.length && !visitor && !session) return;

  await send({
    visitor: visitor ?? undefined,
    session: session ?? undefined,
    pageViews: views,
    events: evts,
  });
}

export function sendHeartbeat(sessionId: string, visitorId: string, path?: string): void {
  const currentPath =
    path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined);
  void send({
    heartbeat: { sessionId, visitorId, ...(currentPath ? { path: currentPath } : {}) },
    // Keep the session explicitly active so Live counts survive mobile pagehide.
    session: {
      sessionId,
      visitorId,
      isActive: true,
      lastPage: currentPath ?? null,
      exitPage: currentPath ?? null,
    },
  });
}

export function startFlushInterval(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
}

export function stopFlushInterval(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function buildVisitorPayload(visitorId: string): VisitorPayload {
  const attr = captureAttribution();
  return {
    visitorId,
    device: {
      type: getDeviceType(),
      screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : null,
      language: navigator.language ?? null,
    },
    geo: {
      timezone:
        typeof Intl !== 'undefined'
          ? (Intl.DateTimeFormat().resolvedOptions().timeZone ?? null)
          : null,
    },
    referrer: attr.referrer ?? null,
    utmSource: attr.utmSource ?? null,
    utmMedium: attr.utmMedium ?? null,
    utmCampaign: attr.utmCampaign ?? null,
    utmTerm: attr.utmTerm ?? null,
    utmContent: attr.utmContent ?? null,
    fbclid: attr.fbclid ?? null,
    gclid: attr.gclid ?? null,
    ttclid: attr.ttclid ?? null,
    msclkid: attr.msclkid ?? null,
    igshid: attr.igshid ?? null,
    inAppSource: attr.inAppSource ?? null,
    landingPath: attr.landingPath ?? window.location.pathname,
  };
}
