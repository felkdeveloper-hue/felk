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
  eta: string;
  badge?: string;
}

export const SHIPPING_METHOD_OPTIONS: ShippingMethodOption[] = [
  {
    id: 'standard',
    label: 'Standard shipping',
    description: 'Reliable doorstep delivery across Sri Lanka',
    deliveryMethod: 'delivery',
    eta: '3–7 business days',
  },
  {
    id: 'free',
    label: 'Free shipping',
    description: 'Economy delivery at no extra cost',
    deliveryMethod: 'delivery',
    eta: '5–10 business days',
    badge: 'Best value',
  },
];

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description: string;
  enabled: boolean;
  logoSrc: string;
  accent: string;
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: 'payhere',
    label: 'PayHere',
    description: 'Visa, Mastercard & local banking',
    enabled: true,
    logoSrc: '/payments/payhere.svg',
    accent: '#1A73E8',
  },
  {
    id: 'koko',
    label: 'Koko',
    description: 'Buy now, pay later in installments',
    enabled: true,
    logoSrc: '/payments/koko.svg',
    accent: '#6C2BD9',
  },
  {
    id: 'mintpay',
    label: 'Mintpay',
    description: 'Flexible interest-free payments',
    enabled: true,
    logoSrc: '/payments/mintpay.svg',
    accent: '#00A86B',
  },
  {
    id: 'cod',
    label: 'Cash on delivery',
    description: 'Pay in cash when your order arrives',
    enabled: true,
    logoSrc: '/payments/cod.svg',
    accent: '#C45C26',
  },
];

/** Default reservation window when backend omits TTL metadata. */
export const CHECKOUT_RESERVATION_TTL_MINUTES = 30;
