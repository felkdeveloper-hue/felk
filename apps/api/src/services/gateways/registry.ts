import { PAYMENT_METHOD, type PaymentMethod } from '@/constants/payment-status';
import type { PaymentGateway } from '@/services/interfaces/payment-gateway.service';
import { payHereGateway } from '@/services/gateways/payhere.gateway';
import { kokoGateway } from '@/services/gateways/koko.gateway';
import { mintpayGateway } from '@/services/gateways/mintpay.gateway';
import { codGateway } from '@/services/gateways/cod.gateway';
import { ApiError } from '@/utils/errors/api-error';

const REGISTRY: Record<PaymentMethod, PaymentGateway> = {
  [PAYMENT_METHOD.PAYHERE]: payHereGateway,
  [PAYMENT_METHOD.KOKO]: kokoGateway,
  [PAYMENT_METHOD.MINTPAY]: mintpayGateway,
  [PAYMENT_METHOD.COD]: codGateway,
};

/** Resolve the adapter for a supported gateway. Future gateways (Stripe, PayPal, Apple/Google Pay) are not registered yet. */
export function getGateway(method: string): PaymentGateway {
  const gateway = REGISTRY[method as PaymentMethod];
  if (!gateway) {
    throw ApiError.badRequest(
      `Payment method '${method}' is not supported yet`,
      { method },
      'GATEWAY_NOT_SUPPORTED',
    );
  }
  return gateway;
}

export function isKnownGateway(method: string): method is PaymentMethod {
  return Object.values(PAYMENT_METHOD).includes(method as PaymentMethod);
}
