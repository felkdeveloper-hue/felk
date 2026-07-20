export interface AuthFormHeaderProps {
  title: string;
  description?: string;
}

export function AuthFormHeader({ title, description }: AuthFormHeaderProps) {
  return (
    <header className="mb-8 space-y-3">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.28em]">
        Member access
      </p>
      <h1 className="font-display text-foreground text-3xl font-bold uppercase leading-[0.95] tracking-[-0.04em] sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
    </header>
  );
}
