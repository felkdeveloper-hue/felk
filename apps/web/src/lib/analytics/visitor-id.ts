const VISITOR_ID_KEY = '_fe_vid';

/**
 * Returns a stable visitor UUID stored in localStorage.
 * Generates a new one on first visit.
 */
export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_ID_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // SSR / private browsing fallback
    return crypto.randomUUID();
  }
}
