import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROUTES } from '@/constants';
import { useResetPasswordMutation } from '@/hooks/auth';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/schemas';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AuthFormHeader } from '@/components/auth/auth-form-header';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
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

export interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const resetMutation = useResetPasswordMutation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');

  const onSubmit = (values: ResetPasswordFormValues) => {
    resetMutation.mutate({ token, password: values.password });
  };

  if (!token) {
    return (
      <div>
        <AuthFormHeader
          title="Invalid reset link"
          description="This password reset link is missing or malformed."
        />
        <Alert variant="destructive">
          <AlertDescription>
            Request a new link from the{' '}
            <Link
              to={ROUTES.authForgotPassword}
              className="text-primary font-medium hover:underline"
            >
              forgot password
            </Link>{' '}
            page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <AuthFormHeader
        title="Reset password"
        description="Choose a strong password for your account."
      />

      {resetMutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={resetMutation.error} onRetry={() => resetMutation.reset()} />
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordField autoComplete="new-password" {...field} />
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
                  <PasswordField autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={resetMutation.isPending}>
            Reset password
          </Button>
        </form>
      </Form>
    </div>
  );
}
