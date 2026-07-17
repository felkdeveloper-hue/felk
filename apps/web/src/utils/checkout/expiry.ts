export function msUntilExpiry(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, target - now);
}

export function isExpired(iso: string | null | undefined, now = Date.now()): boolean {
  const remaining = msUntilExpiry(iso, now);
  return remaining !== null && remaining <= 0;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
