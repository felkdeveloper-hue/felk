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
        description="Welcome back. Enter your credentials to access your account."
      />

      {resetSuccess ? (
        <Alert variant="success" className="mb-4">
          <AlertDescription>Your password has been reset. You can sign in now.</AlertDescription>
        </Alert>
      ) : null}

      {loginMutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={loginMutation.error} onRetry={() => loginMutation.reset()} />
          {getAuthErrorMessage(loginMutation.error) ===
          'Please verify your email before signing in.' ? (
            <p className="text-muted-foreground mt-3 text-sm">
              <Link
                to={ROUTES.authVerifyEmail}
                className="text-primary font-medium hover:underline"
              >
                Resend verification email
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link
                    to={ROUTES.authForgotPassword}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordField autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Remember me</FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={loginMutation.isPending}>
            Sign in
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.authRegister} className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
