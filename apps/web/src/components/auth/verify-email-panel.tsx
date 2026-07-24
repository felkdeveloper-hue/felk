import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Mail } from 'lucide-react';
import { ROUTES } from '@/constants';
import { useResendVerificationMutation, useVerifyEmailMutation } from '@/hooks/auth';
import { getPostLoginDestination, buildVerifyEmailSearch } from '@/utils/auth-redirect';
import { resendVerificationSchema } from '@/schemas';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthFormHeader } from '@/components/auth/auth-form-header';
import { OtpInput } from '@/components/forms/otp-input';
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

export interface VerifyEmailPanelProps {
  email?: string;
  pending?: boolean;
}

export function VerifyEmailPanel({ email }: VerifyEmailPanelProps) {
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendVerificationMutation();
  const [code, setCode] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState(email ?? '');

  const resendForm = useForm<{ email: string }>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: email ?? '' },
  });

  useEffect(() => {
    if (email) {
      setVerifiedEmail(email);
      resendForm.setValue('email', email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleVerify = (submittedCode: string) => {
    if (!verifiedEmail || submittedCode.length !== 6) return;
    verifyMutation.mutate({ email: verifiedEmail, code: submittedCode });
  };

  if (verifyMutation.isSuccess && verifyMutation.data) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="text-success mx-auto size-12" aria-hidden />
        <AuthFormHeader
          title="Email verified"
          description="Your email has been confirmed. Redirecting you now…"
        />
        <Button asChild className="w-full">
          <Link to={getPostLoginDestination(verifyMutation.data.user)}>
            Continue to your account
          </Link>
        </Button>
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
          verifiedEmail
            ? `Enter the 6-digit code we sent to ${verifiedEmail}.`
            : 'Enter the 6-digit code we sent to your email to activate your account.'
        }
      />

      {verifiedEmail ? (
        <Alert>
          <AlertDescription className="space-y-1 text-sm">
            <p>
              The code was sent to <strong>{verifiedEmail}</strong> — open that inbox, not your SMTP
              or admin Gmail account.
            </p>
            <p>Check spam/junk too. Sender may appear as Fashion Edge.</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {!verifiedEmail ? (
        <EmailPrompt onSubmit={(value) => setVerifiedEmail(value)} />
      ) : (
        <>
          {verifyMutation.error ? (
            <AuthErrorAlert error={verifyMutation.error} onRetry={() => verifyMutation.reset()} />
          ) : null}

          <div className="flex flex-col items-center gap-4">
            <OtpInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              disabled={verifyMutation.isPending}
              autoFocus
            />
            <Button
              type="button"
              className="w-full"
              loading={verifyMutation.isPending}
              disabled={code.length !== 6}
              onClick={() => handleVerify(code)}
            >
              Verify email
            </Button>
          </div>

          <Alert>
            <AlertDescription>
              Didn&apos;t get the code? Check spam or resend it below.
            </AlertDescription>
          </Alert>

          <ResendForm
            form={resendForm}
            mutation={resendMutation}
            defaultEmail={verifiedEmail}
            onSuccess={(sentTo) => {
              setVerifiedEmail(sentTo);
              setCode('');
              verifyMutation.reset();
              navigate({
                to: ROUTES.authVerifyEmail,
                search: buildVerifyEmailSearch({
                  email: sentTo,
                  pending: true,
                }),
              });
            }}
          />
        </>
      )}
    </div>
  );
}

function EmailPrompt({ onSubmit }: { onSubmit: (email: string) => void }) {
  const form = useForm<{ email: string }>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values.email))}
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
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </Form>
  );
}

interface ResendFormProps {
  form: ReturnType<typeof useForm<{ email: string }>>;
  mutation: ReturnType<typeof useResendVerificationMutation>;
  defaultEmail?: string;
  onSuccess?: (email: string) => void;
}

function ResendForm({ form, mutation, defaultEmail, onSuccess }: ResendFormProps) {
  useEffect(() => {
    if (defaultEmail) {
      form.setValue('email', defaultEmail);
    }
  }, [defaultEmail, form]);

  if (mutation.isSuccess) {
    return (
      <Alert variant="success">
        <AlertDescription>A new verification code was sent to your email.</AlertDescription>
      </Alert>
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
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate(values.email, {
              onSuccess: () => onSuccess?.(values.email),
            }),
          )}
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
          <Button type="submit" className="w-full" variant="outline" loading={mutation.isPending}>
            Resend verification code
          </Button>
        </form>
      </Form>
    </div>
  );
}
