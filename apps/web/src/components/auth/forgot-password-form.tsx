import { Link, useNavigate } from '@tanstack/react-router';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const forgotMutation = useForgotPasswordMutation();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    forgotMutation.mutate(values.email, {
      onSuccess: (result) => {
        navigate({
          to: ROUTES.authResetPassword,
          search: { email: values.email, devResetCode: result.devResetCode },
        });
      },
    });
  };

  return (
    <div>
      <AuthFormHeader
        title="Forgot password"
        description="Enter your email and we'll send you a 6-digit code to reset your password."
      />

      {forgotMutation.error ? (
        <div className="mb-5">
          <AuthErrorAlert error={forgotMutation.error} onRetry={() => forgotMutation.reset()} />
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

          <Button type="submit" size="lg" className="w-full" loading={forgotMutation.isPending}>
            Send reset code
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground border-border mt-8 border-t pt-6 text-center text-sm">
        <Link
          to={ROUTES.authLogin}
          className="text-foreground font-semibold underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
