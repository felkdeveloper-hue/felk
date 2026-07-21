import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CustomerAddress, CustomerAddressInput } from '@/services/sdk';
import { useCreateAddressMutation, useAddressesQuery } from '@/hooks/account';
import { AddressForm } from '@/components/account/address-form';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface AddressPickerProps {
  label: string;
  selectedId: string | null;
  onSelect: (addressId: string) => void;
  filter?: (address: CustomerAddress) => boolean;
}

function formatAddressLine(address: CustomerAddress): string {
  return [address.line1, address.city, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
}

export function AddressPicker({ label, selectedId, onSelect, filter }: AddressPickerProps) {
  const { data: addresses, isLoading, error, refetch } = useAddressesQuery();
  const createMutation = useCreateAddressMutation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const visible = (addresses ?? []).filter((address) => (filter ? filter(address) : true));

  const handleCreate = (values: CustomerAddressInput) => {
    createMutation.mutate(values, {
      onSuccess: (created) => {
        onSelect(created.id);
        setDialogOpen(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <AuthErrorAlert error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-base font-medium">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add address
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          No saved addresses. Add one to continue.
        </div>
      ) : (
        <RadioGroup value={selectedId ?? undefined} onValueChange={onSelect} className="space-y-3">
          {visible.map((address) => (
            <label
              key={address.id}
              htmlFor={`address-${address.id}`}
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
                selectedId && selectedId === address.id
                  ? 'border-primary ring-primary/30 ring-1'
                  : 'border-border',
              )}
            >
              <RadioGroupItem value={address.id} id={`address-${address.id}`} className="mt-1" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{address.fullName}</p>
                {address.phone ? <p className="text-muted-foreground">{address.phone}</p> : null}
                <p className="text-muted-foreground mt-1">{formatAddressLine(address)}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add address</DialogTitle>
            <DialogDescription>
              Save a shipping or billing address to your account.
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            onSubmit={handleCreate}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
