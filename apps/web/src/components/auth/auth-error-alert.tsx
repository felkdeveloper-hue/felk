import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { AppError } from '@/lib/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface AuthErrorAlertProps {
  error: unknown;
  onRetry?: () => void;
}

export function AuthErrorAlert({ error, onRetry }: AuthErrorAlertProps) {
  const appError = AppError.isAppError(error) ? error : AppError.fromUnknown(error);
  const isOffline = appError.isNetworkError || appError.isTimeout;

  return (
    <Alert variant="destructive" role="alert">
      {isOffline ? <WifiOff aria-hidden /> : <AlertCircle aria-hidden />}
      <AlertTitle>{isOffline ? 'Connection problem' : 'Unable to continue'}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>{appError.message}</p>
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
