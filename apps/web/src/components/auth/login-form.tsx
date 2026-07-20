import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROUTES } from '@/constants';
import { getAuthErrorMessage, useLoginMutation, type LoginMutationInput } from '@/hooks/auth';
import { loginSchema, type LoginFormValues } from '@/schemas';
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
import { PasswordField } from '@/components/forms/password-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export interface LoginFormProps {
  redirect?: string;
  resetSuccess?: boolean;
}

export function LoginForm({ redirect, resetSuccess }: LoginFormProps) {
  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    const payload: LoginMutationInput = { ...values, redirect };
    loginMutation.mutate(payload);
  };

  return (
    <div>
      <AuthFormHeader
        title="Sign in"
        description="Welcome back. Enter your details to continue shopping."
      />

      {resetSuccess ? (
        <Alert variant="success" className="mb-5">
          <AlertDescription>Your password has been reset. You can sign in now.</AlertDescription>
        </Alert>
      ) : null}

      {loginMutation.error ? (
        <div className="mb-5">
          <AuthErrorAlert error={loginMutation.error} onRetry={() => loginMutation.reset()} />
          {getAuthErrorMessage(loginMutation.error) ===
          'Please verify your email before signing in.' ? (
            <p className="text-muted-foreground mt-3 text-sm">
              <Link
                to={ROUTES.authVerifyEmail}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Resend verification email
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField
            control={form.control}
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to={ROUTES.authForgotPassword}
                    className="text-muted-foreground hover:text-foreground text-xs font-medium underline-offset-4 transition-colors hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordField
                    autoComplete="current-password"
                    className="h-11 rounded-sm bg-transparent"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2.5 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-muted-foreground font-normal">Remember me</FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" size="lg" className="mt-1 w-full" loading={loginMutation.isPending}>
            Sign in
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground border-border mt-8 border-t pt-6 text-center text-sm">
        New here?{' '}
        <Link
          to={ROUTES.authRegister}
          search={redirect ? { redirect } : undefined}
          className="text-foreground font-semibold underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
