import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import type { CustomerAddress, CustomerAddressInput } from '@/services/sdk';
import { addressSchema, type AddressFormValues } from '@/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Convert ISO 3166-1 alpha-2 code to a regional-indicator flag emoji. */
function countryFlag(code: string) {
  return [...code.toUpperCase()]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
}

const COUNTRY_OPTIONS = [
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'IN', label: 'India' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SG', label: 'Singapore' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'AU', label: 'Australia' },
  { value: 'CA', label: 'Canada' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
].map((country) => ({
  ...country,
  flag: countryFlag(country.value),
}));

export interface AddressFormProps {
  address?: CustomerAddress;
  onSubmit: (values: CustomerAddressInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  /** Tighter mobile layout for checkout / dialogs. */
  compact?: boolean;
}

const compactField = 'gap-1!';
const compactLabel = 'text-[11px] leading-none sm:text-xs';
const compactInput = 'h-9! md:h-9! text-sm';

export function AddressForm({
  address,
  onSubmit,
  onCancel,
  isSubmitting,
  compact = false,
}: AddressFormProps) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      type: 'both',
      label: 'home',
      fullName: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'LK',
      isDefaultShipping: false,
      isDefaultBilling: false,
    },
  });

  useEffect(() => {
    if (address) {
      form.reset({
        type: (address.type as AddressFormValues['type']) ?? 'both',
        label: (address.label as AddressFormValues['label']) ?? 'home',
        fullName: address.fullName,
        phone: address.phone ?? '',
        line1: address.line1,
        line2: address.line2 ?? '',
        city: address.city,
        state: address.state ?? '',
        postalCode: address.postalCode ?? '',
        country: address.country,
        isDefaultShipping: Boolean(address.isDefaultShipping),
        isDefaultBilling: Boolean(address.isDefaultBilling),
      });
    }
  }, [address, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            ...values,
            line2: values.line2 || undefined,
            state: values.state || undefined,
          }),
        )}
        className={compact ? 'space-y-2 sm:space-y-4' : 'space-y-4'}
        noValidate
      >
        <div className={compact ? 'grid grid-cols-2 gap-2 sm:gap-4' : 'space-y-4'}>
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className={compact ? compactField : undefined}>
                <FormLabel className={compact ? compactLabel : undefined}>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" className={compact ? compactInput : undefined} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className={compact ? compactField : undefined}>
                <FormLabel className={compact ? compactLabel : undefined}>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    className={compact ? compactInput : undefined}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="line1"
          render={({ field }) => (
            <FormItem className={compact ? compactField : undefined}>
              <FormLabel className={compact ? compactLabel : undefined}>Address line 1</FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-line1"
                  className={compact ? compactInput : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="line2"
          render={({ field }) => (
            <FormItem className={compact ? compactField : undefined}>
              <FormLabel className={compact ? compactLabel : undefined}>
                Address line 2 (optional)
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-line2"
                  className={compact ? compactInput : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className={compact ? 'grid grid-cols-2 gap-2 sm:gap-4' : 'grid gap-4 sm:grid-cols-2'}>
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className={compact ? compactField : undefined}>
                <FormLabel className={compact ? compactLabel : undefined}>City</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="address-level2"
                    className={compact ? compactInput : undefined}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem className={compact ? compactField : undefined}>
                <FormLabel className={compact ? compactLabel : undefined}>State / region</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="address-level1"
                    className={compact ? compactInput : undefined}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={compact ? 'grid grid-cols-2 gap-2 sm:gap-4' : 'grid gap-4 sm:grid-cols-2'}>
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem className={compact ? compactField : undefined}>
                <FormLabel className={compact ? compactLabel : undefined}>Postal code</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="postal-code"
                    className={compact ? compactInput : undefined}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem className={compact ? compactField : undefined}>
                <FormLabel className={compact ? compactLabel : undefined}>Country</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger
                      aria-label="Country"
                      className={compact ? 'h-9! text-sm' : undefined}
                    >
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="text-base leading-none">
                            {country.flag}
                          </span>
                          <span>{country.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                    {field.value &&
                    !COUNTRY_OPTIONS.some((country) => country.value === field.value) ? (
                      <SelectItem value={field.value}>
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="text-base leading-none">
                            {countryFlag(field.value)}
                          </span>
                          <span>{field.value}</span>
                        </span>
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem className={compact ? 'hidden sm:grid' : undefined}>
              <FormLabel>Label</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select label" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div
          className={
            compact
              ? 'hidden'
              : 'flex flex-col gap-3 sm:flex-row sm:gap-6'
          }
        >
          <FormField
            control={form.control}
            name="isDefaultShipping"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Default shipping</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isDefaultBilling"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Default billing</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className={compact ? 'flex justify-end gap-2 pt-0.5' : 'flex justify-end gap-2 pt-2'}>
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              className={compact ? 'h-9 text-sm' : undefined}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            loading={isSubmitting}
            className={compact ? 'h-9 w-full text-sm sm:w-auto' : undefined}
          >
            {address ? 'Save address' : 'Add address'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
