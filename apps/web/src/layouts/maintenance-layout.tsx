interface MaintenanceLayoutProps {
  title?: string;
  description?: string;
}

/** Full-screen shell shown when the storefront is in maintenance mode. */
export function MaintenanceLayout({
  title = "We'll be right back",
  description = "We're performing scheduled maintenance. Please check back shortly.",
}: MaintenanceLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-400">Maintenance</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-neutral-600">{description}</p>
    </div>
  );
}
