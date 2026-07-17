import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROUTES } from '@/constants';
import { useForgotPasswordMutation } from '@/hooks/auth';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/schemas';
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

export function ForgotPasswordForm() {
  const forgotMutation = useForgotPasswordMutation();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    forgotMutation.mutate(values.email);
  };

  if (forgotMutation.isSuccess) {
    return (
      <div>
        <AuthFormHeader
          title="Check your email"
          description="If an account exists for that address, we sent password reset instructions."
        />
        <Alert variant="success">
          <AlertDescription>
            Didn&apos;t receive it? Check spam or{' '}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => forgotMutation.reset()}
            >
              try again
            </button>
            .
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to={ROUTES.authLogin}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <AuthFormHeader
        title="Forgot password"
        description="Enter your email and we'll send you a link to reset your password."
      />

      {forgotMutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={forgotMutation.error} onRetry={() => forgotMutation.reset()} />
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

          <Button type="submit" className="w-full" loading={forgotMutation.isPending}>
            Send reset link
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link to={ROUTES.authLogin} className="text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
