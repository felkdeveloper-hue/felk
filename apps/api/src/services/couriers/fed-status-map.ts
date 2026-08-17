import { ORDER_STATUS, type OrderStatus } from '@/constants/order-status.js';

const SHIPPED_KEYWORDS = [
  'dispatch',
  'dispatched',
  'out for delivery',
  'in transit',
  'shipped',
  'picked',
  'pickup',
  'on the way',
];

const DELIVERED_KEYWORDS = ['deliver', 'delivered', 'completed delivery'];

/**
 * Map FED reverse-API delivery_status text to an internal order status, if any.
 */
export function mapFedStatusToOrderStatus(deliveryStatus: string): OrderStatus | null {
  const normalized = deliveryStatus.trim().toLowerCase();
  if (!normalized) return null;

  if (DELIVERED_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return ORDER_STATUS.DELIVERED;
  }

  if (SHIPPED_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return ORDER_STATUS.SHIPPED;
  }

  return null;
}

/** Fulfillment pipeline used to auto-advance orders when courier status jumps ahead. */
export const FULFILLMENT_PIPELINE: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.READY_FOR_SHIPMENT,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];
