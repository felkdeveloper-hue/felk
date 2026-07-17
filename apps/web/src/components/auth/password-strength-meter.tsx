import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const CHECKS = [
  { test: (value: string) => value.length >= 8, label: 'At least 8 characters' },
  { test: (value: string) => /[a-z]/.test(value), label: 'Lowercase letter' },
  { test: (value: string) => /[A-Z]/.test(value), label: 'Uppercase letter' },
  { test: (value: string) => /\d/.test(value), label: 'Number' },
  { test: (value: string) => /[^A-Za-z0-9]/.test(value), label: 'Special character' },
] as const;

function scorePassword(value: string): number {
  if (!value) return 0;
  const passed = CHECKS.filter((check) => check.test(value)).length;
  return Math.round((passed / CHECKS.length) * 100);
}

function strengthLabel(score: number): string {
  if (score === 0) return 'Enter a password';
  if (score < 40) return 'Weak';
  if (score < 80) return 'Fair';
  if (score < 100) return 'Good';
  return 'Strong';
}

export interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  const score = scorePassword(password);
  const label = strengthLabel(score);

  return (
    <div className={cn('space-y-2', className)} aria-live="polite">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Password strength</span>
        <span>{label}</span>
      </div>
      <Progress value={score} aria-label={`Password strength: ${label}`} />
      <ul className="text-muted-foreground grid gap-1 text-xs">
        {CHECKS.map((check) => {
          const met = check.test(password);
          return (
            <li key={check.label} className={cn(met && password ? 'text-success' : undefined)}>
              {met && password ? '✓' : '○'} {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
