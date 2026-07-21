import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  message: z.string().min(10, 'Message should be at least 10 characters'),
});

export type ContactFormValues = z.infer<typeof schema>;

export interface ContactFormProps {
  idPrefix?: string;
  className?: string;
  onSuccess?: () => void;
}

export function ContactForm({ idPrefix = 'contact', className, onSuccess }: ContactFormProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', message: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast.success('Message sent', {
      description: `Thanks ${values.name}, we'll reply to ${values.email} soon.`,
    });
    form.reset();
    onSuccess?.();
  });

  const nameId = `${idPrefix}-name`;
  const emailId = `${idPrefix}-email`;
  const messageId = `${idPrefix}-message`;

  return (
    <form onSubmit={onSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label htmlFor={nameId} className="text-sm font-medium">
          Name
        </label>
        <Input
          id={nameId}
          autoComplete="name"
          {...form.register('name')}
          aria-invalid={Boolean(form.formState.errors.name)}
        />
        {form.formState.errors.name ? (
          <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor={emailId} className="text-sm font-medium">
          Email
        </label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          {...form.register('email')}
          aria-invalid={Boolean(form.formState.errors.email)}
        />
        {form.formState.errors.email ? (
          <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor={messageId} className="text-sm font-medium">
          Message
        </label>
        <Textarea
          id={messageId}
          rows={5}
          {...form.register('message')}
          aria-invalid={Boolean(form.formState.errors.message)}
        />
        {form.formState.errors.message ? (
          <p className="text-destructive text-sm">{form.formState.errors.message.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="rounded-full px-8" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
