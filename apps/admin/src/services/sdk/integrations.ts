import { http } from '@/lib/http-client';

export interface GatewayStatus {
  name: string;
  configured: boolean;
  enabled: boolean;
  extra?: Record<string, unknown>;
}

export interface SmtpStatus extends GatewayStatus {
  verified?: boolean;
}

export interface IntegrationsStatus {
  gateways: {
    payhere: GatewayStatus;
    koko: GatewayStatus;
    mintpay: GatewayStatus;
    cod: GatewayStatus;
  };
  smtp: SmtpStatus;
  analytics: {
    meta: GatewayStatus;
    tiktok: GatewayStatus;
  };
  lastWebhook?: { gateway: string; receivedAt: string; status: string } | null;
  lastEmail?: { to: string; subject: string; sentAt: string } | null;
  lastAnalyticsEvent?: { provider: string; eventName: string; sentAt: string } | null;
}

export const integrationsApi = {
  async getStatus(): Promise<IntegrationsStatus> {
    return http.get<IntegrationsStatus>('/integrations/status');
  },
};
