import { Link } from '@tanstack/react-router';
import { ROUTES } from '@/constants';

interface ErrorLayoutProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/** Full-screen shell for uncaught errors, route errors, and 404s. */
export function ErrorLayout({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-400">Error</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-neutral-600">{description}</p>
      <div className="mt-8 flex items-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Try again
          </button>
        ) : null}
        <Link
          to={ROUTES.home}
          className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
