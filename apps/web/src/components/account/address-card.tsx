import { Pencil, Trash2 } from 'lucide-react';
import type { CustomerAddress } from '@/services/sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface AddressCardProps {
  address: CustomerAddress;
  onEdit: (address: CustomerAddress) => void;
  onDelete: (addressId: string) => void;
  isDeleting?: boolean;
}

export function AddressCard({ address, onEdit, onDelete, isDeleting }: AddressCardProps) {
  return (
    <article className="border-border bg-card rounded-xl border p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{address.fullName}</h3>
            {address.label ? <Badge variant="secondary">{address.label}</Badge> : null}
            {address.isDefaultShipping ? <Badge>Default shipping</Badge> : null}
            {address.isDefaultBilling ? <Badge>Default billing</Badge> : null}
          </div>
          <address className="text-muted-foreground text-sm not-italic">
            <p>{address.line1}</p>
            {address.line2 ? <p>{address.line2}</p> : null}
            <p>
              {address.city}
              {address.state ? `, ${address.state}` : ''} {address.postalCode}
            </p>
            <p>{address.country}</p>
            {address.phone ? <p className="mt-1">{address.phone}</p> : null}
          </address>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit address for ${address.fullName}`}
            onClick={() => onEdit(address)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete address for ${address.fullName}`}
            onClick={() => onDelete(address.id)}
            loading={isDeleting}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
