import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ROUTES } from '@/constants';
import { useRegisterMutation } from '@/hooks/auth';
import { registerSchema, type RegisterFormValues } from '@/schemas';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface RegisterFormProps {
  redirect?: string;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    // Single given name — do not duplicate into lastName ("Rohit" → "Rohit Rohit").
    return { firstName: trimmed, lastName: '' };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function RegisterForm({ redirect }: RegisterFormProps) {
  const registerMutation = useRegisterMutation();
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pendingValues, setPendingValues] = useState<RegisterFormValues | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const submitRegistration = (values: RegisterFormValues) => {
    const { firstName, lastName } = splitFullName(values.fullName);

    registerMutation.mutate({
      email: values.email,
      password: values.password,
      firstName,
      lastName,
      phone: values.phone || undefined,
    });
  };

  const handleCreateAccountClick = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    setPendingValues(form.getValues());
    setTermsAccepted(false);
    setTermsOpen(true);
  };

  const handleTermsConfirm = () => {
    if (!termsAccepted || !pendingValues) return;
    submitRegistration(pendingValues);
  };

  const handleTermsOpenChange = (open: boolean) => {
    setTermsOpen(open);
    if (!open) {
      setTermsAccepted(false);
      setPendingValues(null);
    }
  };

  return (
    <div>
      <AuthFormHeader
        title="Join FE"
        description="Create an account to track orders, save favourites, and shop new drops first."
      />

      {registerMutation.error ? (
        <div className="mb-5">
          <AuthErrorAlert error={registerMutation.error} onRetry={() => registerMutation.reset()} />
        </div>
      ) : null}

      <Form {...form}>
        <form className="space-y-5" noValidate onSubmit={(event) => event.preventDefault()}>
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    placeholder="Jane Doe"
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    placeholder="+94 77 000 0000"
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
                <FormLabel>Password</FormLabel>
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
            type="button"
            size="lg"
            className="mt-1 w-full"
            loading={registerMutation.isPending}
            onClick={handleCreateAccountClick}
          >
            Create account
          </Button>
        </form>
      </Form>

      <Dialog open={termsOpen} onOpenChange={handleTermsOpenChange}>
        <DialogContent className="max-h-[90vh] gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            <DialogDescription>
              Please review and accept our terms before creating your account.
            </DialogDescription>
          </DialogHeader>

          <div className="border-border text-muted-foreground max-h-48 overflow-y-auto rounded-md border p-4 text-sm leading-relaxed">
            <p>
              By creating an account with Fashion Edge, you agree to use our services responsibly,
              provide accurate account information, and comply with applicable laws when placing
              orders.
            </p>
            <p className="mt-3">
              We process your personal data to manage your account, fulfil orders, and improve your
              shopping experience. You can read the full details in our policies below.
            </p>
            <p className="mt-3">
              <Link
                to={ROUTES.terms}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Terms of Service
              </Link>
              {' · '}
              <Link
                to={ROUTES.privacy}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
            </p>
          </div>

          <label className="flex items-start gap-2.5">
            <Checkbox
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            />
            <span className="text-muted-foreground text-sm leading-snug">
              I agree to the{' '}
              <Link
                to={ROUTES.terms}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to={ROUTES.privacy}
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleTermsOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={registerMutation.isPending}
              disabled={!termsAccepted}
              onClick={handleTermsConfirm}
            >
              Create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-muted-foreground border-border mt-8 border-t pt-6 text-center text-sm">
        Already a member?{' '}
        <Link
          to={ROUTES.authLogin}
          search={redirect ? { redirect } : undefined}
          className="text-foreground font-semibold underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
