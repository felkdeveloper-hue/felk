import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { CheckoutValidationIssue } from '@/services/sdk';

export interface CheckoutValidationAlertProps {
  issues?: CheckoutValidationIssue[];
}

export function CheckoutValidationAlert({ issues }: CheckoutValidationAlertProps) {
  if (!issues?.length) return null;

  const errors = issues.filter((issue) => issue.severity !== 'warning');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const visible = errors.length ? errors : warnings;
  if (!visible.length) return null;

  const isError = errors.length > 0;

  return (
    <Alert variant={isError ? 'destructive' : 'default'} role="alert" className="mb-6">
      <AlertCircle aria-hidden />
      <AlertTitle>{isError ? 'Checkout needs attention' : 'Checkout warnings'}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
          {visible.map((issue, index) => (
            <li key={`${issue.code ?? issue.message}-${index}`}>{issue.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
