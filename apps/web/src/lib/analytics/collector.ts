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
}

interface SessionPayload {
  sessionId: string;
  visitorId: string;
  startedAt?: string;
  entryPage?: string | null;
  pageCount?: number;
  clickCount?: number;
  maxScrollDepth?: number;
}

interface CollectPayload {
  visitor?: VisitorPayload;
  session?: SessionPayload;
  pageViews?: PageViewItem[];
  events?: EventItem[];
  heartbeat?: { sessionId: string; visitorId: string };
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

function getUtmParam(key: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

async function send(payload: CollectPayload): Promise<void> {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(ENDPOINT, blob);
    return;
  }
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* tracking errors must never surface */
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
  pendingSession = s;
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

export function sendHeartbeat(sessionId: string, visitorId: string): void {
  void send({ heartbeat: { sessionId, visitorId } });
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
  return {
    visitorId,
    device: {
      type: getDeviceType(),
      screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : null,
      language: navigator.language ?? null,
    },
    referrer: document.referrer || null,
    utmSource: getUtmParam('utm_source'),
    utmMedium: getUtmParam('utm_medium'),
    utmCampaign: getUtmParam('utm_campaign'),
    utmTerm: getUtmParam('utm_term'),
    utmContent: getUtmParam('utm_content'),
  };
}
