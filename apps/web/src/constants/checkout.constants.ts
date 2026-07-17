import { ROUTES } from '@/constants/routes';
import type { PaymentMethod, ShippingMethod } from '@/services/sdk';

export type CheckoutStepId = 'information' | 'shipping' | 'payment' | 'review';

export interface CheckoutStep {
  id: CheckoutStepId;
  label: string;
  path: string;
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: 'information', label: 'Information', path: ROUTES.checkout },
  { id: 'shipping', label: 'Shipping', path: ROUTES.checkoutShipping },
  { id: 'payment', label: 'Payment', path: ROUTES.checkoutPayment },
  { id: 'review', label: 'Review', path: ROUTES.checkoutReview },
];

export interface ShippingMethodOption {
  id: ShippingMethod;
  label: string;
  description: string;
  deliveryMethod?: 'delivery' | 'pickup';
}

export const SHIPPING_METHOD_OPTIONS: ShippingMethodOption[] = [
  {
    id: 'standard',
    label: 'Standard shipping',
    description: 'Delivered in 3–7 business days',
    deliveryMethod: 'delivery',
  },
  {
    id: 'express',
    label: 'Express shipping',
    description: 'Delivered in 1–2 business days',
    deliveryMethod: 'delivery',
  },
  {
    id: 'free',
    label: 'Free shipping',
    description: 'Economy delivery at no extra cost',
    deliveryMethod: 'delivery',
  },
  {
    id: 'pickup',
    label: 'Store pickup',
    description: 'Collect from our warehouse',
    deliveryMethod: 'pickup',
  },
];

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'payhere',
    label: 'PayHere',
    description: 'Cards and local payment methods via PayHere',
    enabled: true,
  },
  {
    id: 'koko',
    label: 'Koko',
    description: 'Buy now, pay later with Koko',
    enabled: true,
  },
  {
    id: 'mintpay',
    label: 'Mintpay',
    description: 'Flexible installments with Mintpay',
    enabled: true,
  },
  {
    id: 'cod',
    label: 'Cash on delivery',
    description: 'Pay when your order arrives',
    enabled: true,
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'International cards',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'paypal',
    label: 'PayPal',
    description: 'Pay with your PayPal balance',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'apple_pay',
    label: 'Apple Pay',
    description: 'One-tap checkout on Apple devices',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'google_pay',
    label: 'Google Pay',
    description: 'Fast checkout with Google Pay',
    enabled: false,
    comingSoon: true,
  },
];

/** Default reservation window when backend omits TTL metadata. */
export const CHECKOUT_RESERVATION_TTL_MINUTES = 30;
