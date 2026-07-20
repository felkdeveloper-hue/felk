import type { PaymentMethod } from '@/constants/payment-status';

/**
 * Payment gateway adapter contract — interface only.
 * Concrete PayHere/Koko/Mintpay adapters arrive in later phases.
 */
export interface CreatePaymentSessionInput {
  orderId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentSessionResult {
  gatewayPaymentId: string;
  redirectUrl?: string;
  raw?: Record<string, unknown>;
}

export interface WebhookVerificationInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer | string;
}

export interface PaymentGateway {
  readonly name: PaymentMethod;
  createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<{
    valid: boolean;
    gatewayTxnId?: string;
    orderId?: string;
    status?: string;
    amount?: number;
    currency?: string;
    payload?: Record<string, unknown>;
  }>;
  refund?(input: {
    gatewayPaymentId: string;
    amount: number;
    reason?: string;
  }): Promise<{ gatewayTxnId: string; status: string }>;
  verifyTransaction?(orderId: string): Promise<{
    status: string;
    amount?: number;
    currency?: string;
  } | null>;
}
