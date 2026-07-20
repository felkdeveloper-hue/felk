import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useResendVerificationMutation, useVerifyEmailMutation } from '@/hooks/auth';
import { buildVerifyEmailSearch } from '@/utils/auth-redirect';
import { AppError } from '@/lib/errors';
import { resendVerificationSchema } from '@/schemas';
import { DevVerificationLink } from '@/components/auth/dev-verification-link';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthFormHeader } from '@/components/auth/auth-form-header';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export interface VerifyEmailPanelProps {
  token?: string;
  email?: string;
  pending?: boolean;
  devVerificationUrl?: string;
}

export function VerifyEmailPanel({
  token,
  email,
  pending,
  devVerificationUrl,
}: VerifyEmailPanelProps) {
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();
  const [verificationState, setVerificationState] = useState<
    'idle' | 'loading' | 'success' | 'expired' | 'invalid'
  >('idle');

  const resendForm = useForm<{ email: string }>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: email ?? '' },
  });

  useEffect(() => {
    if (!token) {
      setVerificationState(pending ? 'idle' : 'idle');
      return;
    }

    setVerificationState('loading');
    verifyMutation.mutate(token, {
      onSuccess: () => setVerificationState('success'),
      onError: (error) => {
        if (AppError.isAppError(error)) {
          if (error.code === 'TOKEN_EXPIRED') {
            setVerificationState('expired');
            return;
          }
          if (error.code === 'INVALID_TOKEN' || error.status === 404) {
            setVerificationState('invalid');
            return;
          }
        }
        setVerificationState('invalid');
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (token && verificationState === 'loading') {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <AuthFormHeader
          title="Verifying email"
          description="Please wait while we confirm your address."
        />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (verificationState === 'success') {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="text-success mx-auto size-12" aria-hidden />
        <AuthFormHeader
          title="Email verified"
          description="Your email has been confirmed. You can now sign in to your account."
        />
        <Button asChild className="w-full">
          <Link to={ROUTES.authLogin}>Continue to sign in</Link>
        </Button>
      </div>
    );
  }

  if (verificationState === 'expired') {
    return (
      <div className="space-y-4">
        <AuthFormHeader
          title="Link expired"
          description="This verification link has expired. Request a new one below."
        />
        <ResendForm
          form={resendForm}
          mutation={resendMutation}
          defaultEmail={email}
          onSuccess={() =>
            navigate({
              to: ROUTES.authVerifyEmail,
              search: buildVerifyEmailSearch({ email, pending: true }),
            })
          }
        />
      </div>
    );
  }

  if (verificationState === 'invalid') {
    return (
      <div className="space-y-4 text-center">
        <XCircle className="text-destructive mx-auto size-12" aria-hidden />
        <AuthFormHeader
          title="Invalid link"
          description="This verification link is invalid or has already been used."
        />
        <ResendForm form={resendForm} mutation={resendMutation} defaultEmail={email} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Mail className="text-primary size-10" aria-hidden />
      </div>
      <AuthFormHeader
        title="Verify your email"
        description={
          email
            ? `We sent a verification link to ${email}. Open it to activate your account.`
            : 'Check your inbox for a verification link to activate your account.'
        }
      />

      <Alert>
        <AlertDescription>
          Didn&apos;t get the email? Check spam or resend the verification message below.
        </AlertDescription>
      </Alert>

      {devVerificationUrl ? <DevVerificationLink url={devVerificationUrl} /> : null}

      <ResendForm
        form={resendForm}
        mutation={resendMutation}
        defaultEmail={email}
        devVerificationUrl={devVerificationUrl}
      />
    </div>
  );
}

interface ResendFormProps {
  form: ReturnType<typeof useForm<{ email: string }>>;
  mutation: ReturnType<typeof useResendVerificationMutation>;
  defaultEmail?: string;
  devVerificationUrl?: string;
  onSuccess?: () => void;
}

function ResendForm({
  form,
  mutation,
  defaultEmail,
  devVerificationUrl,
  onSuccess,
}: ResendFormProps) {
  useEffect(() => {
    if (defaultEmail) {
      form.setValue('email', defaultEmail);
    }
  }, [defaultEmail, form]);

  if (mutation.isSuccess) {
    const verificationUrl = mutation.data?.devVerificationUrl ?? devVerificationUrl;
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <AlertDescription>
            {verificationUrl
              ? 'Verification link generated for local development.'
              : 'Verification email sent. Please check your inbox.'}
          </AlertDescription>
        </Alert>
        {verificationUrl ? <DevVerificationLink url={verificationUrl} /> : null}
      </div>
    );
  }

  return (
    <div>
      {mutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={mutation.error} onRetry={() => mutation.reset()} />
        </div>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values.email, { onSuccess }))}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            Resend verification email
          </Button>
        </form>
      </Form>
    </div>
  );
}
