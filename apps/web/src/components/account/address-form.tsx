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

export interface AddressFormProps {
  address?: CustomerAddress;
  onSubmit: (values: CustomerAddressInput) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AddressForm({ address, onSubmit, onCancel, isSubmitting }: AddressFormProps) {
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
      country: 'US',
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
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
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
          name="line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address line 1</FormLabel>
              <FormControl>
                <Input autoComplete="address-line1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address line 2 (optional)</FormLabel>
              <FormControl>
                <Input autoComplete="address-line2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State / region</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal code</FormLabel>
                <FormControl>
                  <Input autoComplete="postal-code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input autoComplete="country" maxLength={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {address ? 'Save address' : 'Add address'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
