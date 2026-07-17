import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CustomerAddress, CustomerAddressInput } from '@/services/sdk';
import {
  useAddressesQuery,
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useUpdateAddressMutation,
} from '@/hooks/account';
import { AccountPageHeader } from '@/components/account/account-page-header';
import { AddressCard } from '@/components/account/address-card';
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
import { Skeleton } from '@/components/ui/skeleton';

export function AddressesPanel() {
  const { data: addresses, isLoading, error, refetch } = useAddressesQuery();
  const createMutation = useCreateAddressMutation();
  const updateMutation = useUpdateAddressMutation();
  const deleteMutation = useDeleteAddressMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (address: CustomerAddress) => {
    setEditing(address);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: CustomerAddressInput) => {
    if (editing) {
      updateMutation.mutate({ addressId: editing.id, payload: values }, { onSuccess: closeDialog });
      return;
    }
    createMutation.mutate(values, { onSuccess: closeDialog });
  };

  const handleDelete = (addressId: string) => {
    setDeletingId(addressId);
    deleteMutation.mutate(addressId, {
      onSettled: () => setDeletingId(null),
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AccountPageHeader
          title="Addresses"
          description="Manage shipping and billing addresses for faster checkout."
        />
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          Add address
        </Button>
      </div>

      {error ? <AuthErrorAlert error={error} onRetry={() => refetch()} /> : null}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}

      {!isLoading && addresses?.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">No saved addresses yet.</p>
          <Button className="mt-4" onClick={openCreate}>
            Add your first address
          </Button>
        </div>
      ) : null}

      {addresses && addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={openEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === address.id && deleteMutation.isPending}
            />
          ))}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit address' : 'Add address'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update this saved address.' : 'Save a new shipping or billing address.'}
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            address={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
