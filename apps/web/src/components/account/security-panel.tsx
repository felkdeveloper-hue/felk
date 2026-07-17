import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useChangePasswordMutation, useLogoutAllMutation } from '@/hooks/auth';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/schemas';
import { AccountPageHeader } from '@/components/account/account-page-header';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
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

export function SecurityPanel() {
  const changePasswordMutation = useChangePasswordMutation();
  const logoutAllMutation = useLogoutAllMutation();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = form.watch('newPassword');

  const onSubmit = (values: ChangePasswordFormValues) => {
    changePasswordMutation.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => form.reset(),
      },
    );
  };

  return (
    <div className="space-y-10">
      <section>
        <AccountPageHeader
          title="Security"
          description="Update your password and manage active sessions."
        />

        {changePasswordMutation.isSuccess ? (
          <Alert variant="success" className="mb-4">
            <AlertDescription>Password changed successfully.</AlertDescription>
          </Alert>
        ) : null}

        {changePasswordMutation.error ? (
          <div className="mb-4">
            <AuthErrorAlert
              error={changePasswordMutation.error}
              onRetry={() => changePasswordMutation.reset()}
            />
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <PasswordField autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <PasswordField autoComplete="new-password" {...field} />
                  </FormControl>
                  <PasswordStrengthMeter password={newPassword} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <PasswordField autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" loading={changePasswordMutation.isPending}>
              Change password
            </Button>
          </form>
        </Form>
      </section>

      <section className="border-border max-w-md space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="font-medium">Active sessions</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Session management is coming soon. You can sign out of all devices now.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => logoutAllMutation.mutate()}
          loading={logoutAllMutation.isPending}
        >
          Log out all devices
        </Button>
      </section>
    </div>
  );
}
