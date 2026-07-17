export interface AuthFormHeaderProps {
  title: string;
  description?: string;
}

export function AuthFormHeader({ title, description }: AuthFormHeaderProps) {
  return (
    <header className="mb-6 space-y-2 text-center">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
    </header>
  );
}
