import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function DevVerificationLink({ url }: { url: string }) {
  return (
    <Alert className="mt-4 border-amber-300/60 bg-amber-50/80">
      <AlertDescription className="space-y-3 text-sm text-amber-950">
        <p>
          Email delivery is not configured in this environment, so no message was sent to your
          inbox. Use this development verification link instead:
        </p>
        <Button asChild variant="outline" className="w-full bg-white">
          <a href={url}>Verify email now</a>
        </Button>
        <p className="break-all text-xs text-amber-900/80">{url}</p>
      </AlertDescription>
    </Alert>
  );
}
