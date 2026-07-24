import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/hooks/auth';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '@/schemas';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthFormHeader } from '@/components/auth/auth-form-header';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { DevVerificationCode } from '@/components/auth/dev-verification-code';
import { OtpInput } from '@/components/forms/otp-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ResetPasswordFormProps {
  email?: string;
  devResetCode?: string;
}

export function ResetPasswordForm({ email, devResetCode }: ResetPasswordFormProps) {
  const resetMutation = useResetPasswordMutation();
  const forgotMutation = useForgotPasswordMutation();
  const [verifiedEmail, setVerifiedEmail] = useState(email ?? '');
  const [code, setCode] = useState('');
  const [latestDevCode, setLatestDevCode] = useState(devResetCode);

  useEffect(() => {
    if (email) setVerifiedEmail(email);
  }, [email]);

  useEffect(() => {
    setLatestDevCode(devResetCode);
  }, [devResetCode]);

  const emailForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: email ?? '' },
  });

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = form.watch('password');

  if (!verifiedEmail) {
    return (
      <div>
        <AuthFormHeader
          title="Reset password"
          description="Enter your email and we'll send you a 6-digit code to reset your password."
        />

        {forgotMutation.error ? (
          <div className="mb-5">
            <AuthErrorAlert error={forgotMutation.error} onRetry={() => forgotMutation.reset()} />
          </div>
        ) : null}

        <Form {...emailForm}>
          <form
            onSubmit={emailForm.handleSubmit((values) => {
              forgotMutation.mutate(values.email, {
                onSuccess: (result) => {
                  setVerifiedEmail(values.email);
                  setLatestDevCode(result.devResetCode);
                },
              });
            })}
            className="space-y-5"
            noValidate
          >
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-11 rounded-sm bg-transparent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" size="lg" className="w-full" loading={forgotMutation.isPending}>
              Send reset code
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (code.length !== 6) return;
    resetMutation.mutate({ email: verifiedEmail, code, password: values.password });
  };

  const handleResend = () => {
    forgotMutation.mutate(verifiedEmail, {
      onSuccess: (result) => setLatestDevCode(result.devResetCode),
    });
  };

  return (
    <div>
      <AuthFormHeader
        title="Reset password"
        description={`Enter the 6-digit code sent to ${verifiedEmail} and choose a new password.`}
      />

      {resetMutation.error ? (
        <div className="mb-5">
          <AuthErrorAlert error={resetMutation.error} onRetry={() => resetMutation.reset()} />
        </div>
      ) : null}

      {latestDevCode ? <DevVerificationCode code={latestDevCode} /> : null}

      <div className="my-5 flex justify-center">
        <OtpInput
          length={6}
          value={code}
          onChange={setCode}
          disabled={resetMutation.isPending}
          autoFocus
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordField
                    autoComplete="new-password"
                    className="h-11 rounded-sm bg-transparent"
                    {...field}
                  />
                </FormControl>
                <PasswordStrengthMeter password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordField
                    autoComplete="new-password"
                    className="h-11 rounded-sm bg-transparent"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={resetMutation.isPending}
            disabled={code.length !== 6}
          >
            Reset password
          </Button>
        </form>
      </Form>

      {forgotMutation.isSuccess ? (
        <Alert variant="success" className="mt-5">
          <AlertDescription>A new code was sent to your email.</AlertDescription>
        </Alert>
      ) : (
        <p className="text-muted-foreground mt-5 text-center text-sm">
          Didn&apos;t get a code?{' '}
          <button
            type="button"
            className="text-foreground font-medium underline-offset-4 hover:underline"
            onClick={handleResend}
          >
            Resend
          </button>
        </p>
      )}
    </div>
  );
}
