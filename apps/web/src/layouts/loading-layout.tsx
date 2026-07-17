/** Full-screen loading shell used while app-level state (e.g. auth) hydrates. */
export function LoadingLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
