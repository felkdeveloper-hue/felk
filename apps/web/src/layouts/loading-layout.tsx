/** Full-screen loading shell used while app-level state (e.g. auth) hydrates. */
export function LoadingLayout() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="font-display text-2xl font-bold uppercase tracking-[-0.04em]">FE</p>
      <div
        className="border-border border-t-foreground h-8 w-8 animate-spin rounded-full border-2"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
