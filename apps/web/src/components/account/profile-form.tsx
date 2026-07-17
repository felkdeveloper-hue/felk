import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { ROUTES } from '@/constants';
import { useCustomerProfileQuery, useUpdateProfileMutation } from '@/hooks/account';
import { profileSchema, type ProfileFormValues } from '@/schemas';
import { AccountPageHeader } from '@/components/account/account-page-header';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form-field';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export function ProfileForm() {
  const { data: profile, isLoading, error, refetch } = useCustomerProfileQuery();
  const updateMutation = useUpdateProfileMutation();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      profilePhotoUrl: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        gender: profile.gender ?? '',
        profilePhotoUrl: profile.profilePhotoUrl ?? '',
      });
    }
  }, [profile, form]);

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <AuthErrorAlert error={error} onRetry={() => refetch()} />;
  }

  const onSubmit = (values: ProfileFormValues) => {
    updateMutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      profilePhotoUrl: values.profilePhotoUrl || null,
    });
  };

  return (
    <div>
      <AccountPageHeader
        title="Profile"
        description="Manage your personal details and how we contact you."
      />

      {updateMutation.isSuccess ? (
        <Alert variant="success" className="mb-4">
          <AlertDescription>Profile updated successfully.</AlertDescription>
        </Alert>
      ) : null}

      {updateMutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={updateMutation.error} onRetry={() => updateMutation.reset()} />
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4" noValidate>
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <Input type="date" disabled placeholder="Coming soon" {...field} />
                </FormControl>
                <FormDescription>
                  Date of birth editing will be enabled in a future update.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <FormControl>
                  <Input disabled placeholder="Coming soon" {...field} />
                </FormControl>
                <FormDescription>Gender preferences will be available soon.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="profilePhotoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://example.com/avatar.jpg" {...field} />
                </FormControl>
                <FormDescription>Paste a URL to your profile photo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={updateMutation.isPending}>
              Save changes
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={ROUTES.account}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
