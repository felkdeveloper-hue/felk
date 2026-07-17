import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useCustomerPreferencesQuery, useUpdatePreferencesMutation } from '@/hooks/account';
import { preferencesSchema, type PreferencesFormValues } from '@/schemas';
import { AccountPageHeader } from '@/components/account/account-page-header';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PreferencesPanel() {
  const { setTheme, theme } = useTheme();
  const { data, isLoading, error, refetch } = useCustomerPreferencesQuery();
  const updateMutation = useUpdatePreferencesMutation();

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      language: '',
      currency: '',
      newsletter: false,
      sms: false,
      pushNotifications: false,
      marketingEmails: false,
      orderUpdates: true,
      promotions: false,
      wishlistAlerts: false,
      stockAlerts: false,
      referralUpdates: false,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        language: data.preferences?.language ?? '',
        currency: data.preferences?.currency ?? '',
        timezone: data.preferences?.timezone ?? '',
        newsletter: data.preferences?.newsletter ?? false,
        sms: data.preferences?.sms ?? false,
        pushNotifications: data.preferences?.pushNotifications ?? false,
        marketingEmails: data.preferences?.marketingEmails ?? false,
        orderUpdates: data.notificationPreferences?.orderUpdates ?? true,
        promotions: data.notificationPreferences?.promotions ?? false,
        wishlistAlerts: data.notificationPreferences?.wishlistAlerts ?? false,
        stockAlerts: data.notificationPreferences?.stockAlerts ?? false,
        referralUpdates: data.notificationPreferences?.referralUpdates ?? false,
      });
    }
  }, [data, form]);

  const onSubmit = (values: PreferencesFormValues) => {
    updateMutation.mutate({
      preferences: {
        language: values.language || undefined,
        currency: values.currency || undefined,
        timezone: values.timezone || undefined,
        newsletter: values.newsletter,
        sms: values.sms,
        pushNotifications: values.pushNotifications,
        marketingEmails: values.marketingEmails,
      },
      notificationPreferences: {
        orderUpdates: values.orderUpdates,
        promotions: values.promotions,
        wishlistAlerts: values.wishlistAlerts,
        stockAlerts: values.stockAlerts,
        referralUpdates: values.referralUpdates,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return <AuthErrorAlert error={error} onRetry={() => refetch()} />;
  }

  return (
    <div>
      <AccountPageHeader
        title="Preferences"
        description="Customize your shopping experience and communication settings."
      />

      {updateMutation.isSuccess ? (
        <Alert variant="success" className="mb-4">
          <AlertDescription>Preferences saved.</AlertDescription>
        </Alert>
      ) : null}

      {updateMutation.error ? (
        <div className="mb-4">
          <AuthErrorAlert error={updateMutation.error} onRetry={() => updateMutation.reset()} />
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-8" noValidate>
          <section className="space-y-4">
            <h2 className="text-sm font-medium">Appearance</h2>
            <div className="space-y-2">
              <FormLabel>Theme</FormLabel>
              <Select value={theme ?? 'system'} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Choose how the storefront looks on your device.</FormDescription>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Regional</h2>
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input disabled placeholder="Coming soon" {...field} />
                  </FormControl>
                  <FormDescription>Language selection will be available soon.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input disabled placeholder="Coming soon" {...field} />
                  </FormControl>
                  <FormDescription>Currency preferences will be available soon.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Newsletter</h2>
            <PreferenceSwitch
              control={form.control}
              name="newsletter"
              label="Email newsletter"
              description="Receive curated product stories and style guides."
            />
            <PreferenceSwitch
              control={form.control}
              name="marketingEmails"
              label="Marketing emails"
              description="Get notified about sales and exclusive offers."
            />
            <PreferenceSwitch
              control={form.control}
              name="sms"
              label="SMS updates"
              description="Order and delivery updates via text message."
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-medium">Notifications</h2>
            <PreferenceSwitch control={form.control} name="orderUpdates" label="Order updates" />
            <PreferenceSwitch control={form.control} name="promotions" label="Promotions" />
            <PreferenceSwitch
              control={form.control}
              name="wishlistAlerts"
              label="Wishlist alerts"
            />
            <PreferenceSwitch
              control={form.control}
              name="stockAlerts"
              label="Back-in-stock alerts"
            />
            <PreferenceSwitch
              control={form.control}
              name="referralUpdates"
              label="Referral updates"
            />
            <PreferenceSwitch
              control={form.control}
              name="pushNotifications"
              label="Push notifications"
            />
          </section>

          <Button type="submit" loading={updateMutation.isPending}>
            Save preferences
          </Button>
        </form>
      </Form>
    </div>
  );
}

function PreferenceSwitch({
  control,
  name,
  label,
  description,
}: {
  control: Control<PreferencesFormValues>;
  name: keyof PreferencesFormValues;
  label: string;
  description?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="border-border flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            {description ? <FormDescription>{description}</FormDescription> : null}
          </div>
          <FormControl>
            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
