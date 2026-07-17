export interface AccountPageHeaderProps {
  title: string;
  description?: string;
}

export function AccountPageHeader({ title, description }: AccountPageHeaderProps) {
  return (
    <header className="mb-8 space-y-2">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.22em]">
        Account
      </p>
      <h1 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
    </header>
  );
}
