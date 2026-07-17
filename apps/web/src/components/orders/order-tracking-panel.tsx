import { ExternalLink, Truck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Order } from '@/services/sdk';
import { formatDate } from '@/utils/format';

export interface OrderTrackingPanelProps {
  order: Order;
}

export function OrderTrackingPanel({ order }: OrderTrackingPanelProps) {
  const tracking = order.tracking;

  if (!tracking?.carrier && !tracking?.trackingNumber) {
    return (
      <Alert>
        <Truck aria-hidden />
        <AlertDescription>Tracking will appear once your order ships.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="border-border rounded-xl border p-4">
      <h3 className="font-medium">Shipment tracking</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {tracking.carrier ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Carrier</dt>
            <dd className="font-medium">{tracking.carrier}</dd>
          </div>
        ) : null}
        {tracking.trackingNumber ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Tracking number</dt>
            <dd className="font-mono text-sm">{tracking.trackingNumber}</dd>
          </div>
        ) : null}
        {tracking.estimatedDelivery ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Estimated delivery</dt>
            <dd>{formatDate(tracking.estimatedDelivery)}</dd>
          </div>
        ) : null}
      </dl>
      {tracking.trackingUrl ? (
        <a
          href={tracking.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          Track shipment
          <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
