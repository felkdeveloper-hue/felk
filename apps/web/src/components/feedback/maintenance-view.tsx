import { Hammer } from 'lucide-react';

export interface MaintenanceViewProps {
  title?: string;
  description?: string;
  estimatedReturn?: string;
}

export function MaintenanceView({
  title = "We're polishing things up",
  description = "Our store is temporarily down for scheduled maintenance. We'll be back shortly.",
  estimatedReturn,
}: MaintenanceViewProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="bg-accent flex size-14 items-center justify-center rounded-full">
        <Hammer className="text-accent-foreground size-6" />
      </div>
      <h1 className="font-display text-foreground mt-6 text-3xl sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground mt-3 max-w-md">{description}</p>
      {estimatedReturn ? (
        <p className="bg-muted text-muted-foreground mt-6 rounded-full px-4 py-1.5 text-sm font-medium">
          Expected back: {estimatedReturn}
        </p>
      ) : null}
    </div>
  );
}
