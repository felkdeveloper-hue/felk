import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROUTES } from '@/constants';
import { useRegisterMutation } from '@/hooks/auth';
import { registerSchema, type RegisterFormValues } from '@/schemas';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export function RegisterForm() {
  const registerMutation = useRegisterMutation();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      newsletterOptIn: false,
    },
  });

  const password = form.watch('password');

  const onSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate({
      email: values.email,
      password: values.password,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
    });
  };

  return (
    <div>
      <AuthFormHeader
        title="Create account"
        description="Join us to track orders, save addresses, and personalize your experience."
      />

      {registerMutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={registerMutation.error} onRetry={() => registerMutation.reset()} />
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder="+1 555 0100" {...field} />
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
                <FormLabel>Password</FormLabel>
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

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex items-start gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    I agree to the{' '}
                    <Link to={ROUTES.terms} className="text-primary hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to={ROUTES.privacy} className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newsletterOptIn"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Send me product updates and offers</FormLabel>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={registerMutation.isPending}>
            Create account
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{' '}
        <Link to={ROUTES.authLogin} className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
