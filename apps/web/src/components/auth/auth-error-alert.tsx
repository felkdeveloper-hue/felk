import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { AppError } from '@/lib/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface AuthErrorAlertProps {
  error: unknown;
  onRetry?: () => void;
}

interface ValidationIssue {
  path?: string;
  message?: string;
}

function getValidationIssues(appError: AppError): ValidationIssue[] {
  if (appError.code !== 'VALIDATION_ERROR' || !Array.isArray(appError.details)) {
    return [];
  }
  return (appError.details as ValidationIssue[]).filter((issue) => issue?.message);
}

export function AuthErrorAlert({ error, onRetry }: AuthErrorAlertProps) {
  const appError = AppError.isAppError(error) ? error : AppError.fromUnknown(error);
  const isOffline = appError.isNetworkError || appError.isTimeout;
  const issues = getValidationIssues(appError);

  return (
    <Alert variant="destructive" role="alert">
      {isOffline ? <WifiOff aria-hidden /> : <AlertCircle aria-hidden />}
      <AlertTitle>
        {isOffline
          ? 'Connection problem'
          : appError.code === 'EMAIL_SEND_FAILED'
            ? 'Email could not be sent'
            : 'Unable to continue'}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          {appError.code === 'EMAIL_SEND_FAILED'
            ? 'We could not send the verification code to your email. Please try again in a moment or contact support.'
            : appError.message}
        </p>
        {issues.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {issues.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
