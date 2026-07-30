const SESSION_ID_KEY = '_fe_sid';
const SESSION_START_KEY = '_fe_ss';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

let sessionId: string | null = null;
let sessionStartedAt: number | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

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
  return { sessionId, startedAt: new Date(sessionStartedAt), isNew: true };
}

export function refreshIdleTimer(onExpire: () => void) {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    onExpire();
    // rotate session
    sessionId = null;
    sessionStartedAt = null;
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
