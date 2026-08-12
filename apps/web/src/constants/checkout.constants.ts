import { ROUTES } from '@/constants/routes';
import type { PaymentMethod, ShippingMethod } from '@/services/sdk';

export type CheckoutStepId = 'information' | 'payment' | 'review';

export interface CheckoutStep {
  id: CheckoutStepId;
  label: string;
  path: string;
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  { id: 'information', label: 'Information', path: ROUTES.checkout },
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

/** Flat shipping fee applied site-wide (LKR). */
export const FIXED_SHIPPING_AMOUNT = 500;

export const SHIPPING_METHOD_OPTIONS: ShippingMethodOption[] = [
  {
    id: 'standard',
    label: 'Standard shipping',
    description: 'Reliable doorstep delivery across Sri Lanka',
    deliveryMethod: 'delivery',
    eta: '3–7 business days',
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
    enabled: false, // prepaid-only storefront — COD disabled site-wide
    logoSrc: '/payments/cod.svg',
    accent: '#C45C26',
  },
];

/** Payment-window reservation TTL when backend omits metadata (minutes). */
export const CHECKOUT_RESERVATION_TTL_MINUTES = 10;
