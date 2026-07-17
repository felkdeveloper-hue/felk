import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { returnRequestSchema, type ReturnRequestFormValues } from '@/schemas';
import { RETURN_REASONS } from '@/constants/order.constants';
import type { OrderLineItem } from '@/services/sdk';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface ReturnRequestFormProps {
  items: OrderLineItem[];
  onSubmit: (values: ReturnRequestFormValues) => void;
  isSubmitting?: boolean;
}

export function ReturnRequestForm({ items, onSubmit, isSubmitting }: ReturnRequestFormProps) {
  const form = useForm<ReturnRequestFormValues>({
    resolver: zodResolver(returnRequestSchema),
    defaultValues: {
      orderItemId: items[0]?.id,
      reason: '',
      description: '',
      images: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {items.length > 1 ? (
          <FormField
            control={form.control}
            name="orderItemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item to return</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · Qty {item.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RETURN_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional details</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder="Describe the issue (optional)" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URLs</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/photo.jpg"
                  value={field.value?.[0] ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value ? [event.target.value] : [])
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          Submit return request
        </Button>
      </form>
    </Form>
  );
}
