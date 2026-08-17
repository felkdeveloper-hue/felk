import { appConfig } from '@/config/app.config.js';
import { analyticsService } from '@/services/analytics/analytics.service.js';
import {
  buildMetaContentsFromLines,
  purchaseEventId,
} from '@/services/analytics/meta-tracking.helpers.js';
import { customerService } from '@/services/customer.service.js';
import type { CheckoutSessionDocument } from '@/models/checkout.models.js';
import type { OrderDocument } from '@/models/order.models.js';
import type { PaymentDocument } from '@/models/payment.models.js';

/** Send Meta/TikTok Purchase after an order is successfully created. */
export async function trackMetaPurchaseForOrder(
  payment: PaymentDocument,
  order: Pick<OrderDocument, 'orderNumber' | 'items'>,
  checkout?: Pick<CheckoutSessionDocument, 'shippingAddress'> | null,
): Promise<void> {
  try {
    const customer = await customerService.getById(payment.customerId.toString()).catch(() => null);
    const { contentIds, contents, numItems } = buildMetaContentsFromLines(
      order.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        salePrice: item.salePrice,
        unitPrice: item.salePrice ?? item.price,
      })),
    );
    const shipping = (checkout?.shippingAddress ?? {}) as Record<string, unknown>;
    const eventSourceUrl = `${appConfig.email.shopUrl.replace(/\/$/, '')}/checkout/success?checkoutToken=${encodeURIComponent(payment.checkoutToken)}`;

    await analyticsService.trackPurchase({
      orderId: order.orderNumber,
      currency: payment.currency,
      value: payment.amount,
      contentIds,
      contents,
      numItems,
      eventId: purchaseEventId(order.orderNumber),
      eventSourceUrl,
      userData: customer
        ? {
            email: (customer as { email?: string }).email ?? null,
            phone:
              (customer as { phone?: string | null }).phone ??
              (typeof shipping.phone === 'string' ? shipping.phone : null),
            firstName: (customer as { firstName?: string | null }).firstName ?? null,
            lastName: (customer as { lastName?: string | null }).lastName ?? null,
            city: typeof shipping.city === 'string' ? shipping.city : null,
            country:
              typeof shipping.country === 'string'
                ? shipping.country
                : ((customer as { country?: string | null }).country ?? null),
            externalId: payment.customerId.toString(),
          }
        : undefined,
    });
  } catch {
    /* non-blocking */
  }
}
