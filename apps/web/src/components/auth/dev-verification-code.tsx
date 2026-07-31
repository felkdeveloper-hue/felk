import { Alert, AlertDescription } from '@/components/ui/alert';

export function DevVerificationCode({ code }: { code: string }) {
  return (
    <Alert className="mt-4 border-amber-300/60 bg-amber-50/80">
      <AlertDescription className="space-y-3 text-sm text-amber-950">
        <p>
          The verification email could not be delivered (SMTP). Use this development verification
          code instead:
        </p>
        <p className="text-center text-2xl font-bold tracking-[0.5em] text-amber-950">{code}</p>
      </AlertDescription>
    </Alert>
  );
}
