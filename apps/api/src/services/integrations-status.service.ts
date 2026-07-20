import { appConfig } from '@/config/app.config';
import { PaymentWebhookModel } from '@/models/payment.models';
import { EmailLogModel } from '@/models/email-log.model';
import { AnalyticsEventLogModel } from '@/models/analytics.model';
import { emailService } from '@/services/email.service';

export interface IntegrationStatus {
  name: string;
  configured: boolean;
  enabled: boolean;
  extra?: Record<string, unknown>;
}

export interface IntegrationsStatusResult {
  gateways: {
    payhere: IntegrationStatus;
    koko: IntegrationStatus;
    mintpay: IntegrationStatus;
    cod: IntegrationStatus;
  };
  smtp: IntegrationStatus & { verified?: boolean };
  analytics: {
    meta: IntegrationStatus;
    tiktok: IntegrationStatus;
  };
  lastWebhook?: {
    gateway: string;
    receivedAt: Date;
    status: string;
  } | null;
  lastEmail?: {
    to: string;
    subject: string;
    sentAt: Date;
  } | null;
  lastAnalyticsEvent?: {
    provider: string;
    eventName: string;
    sentAt: Date;
  } | null;
}

export class IntegrationsStatusService {
  async getStatus(): Promise<IntegrationsStatusResult> {
    const [lastWebhook, lastEmail, lastAnalyticsEvent, smtpVerified] = await Promise.all([
      PaymentWebhookModel.findOne({ verified: true, processed: true })
        .sort({ createdAt: -1 })
        .select('gateway createdAt processingResult')
        .lean(),
      EmailLogModel.findOne({ status: 'sent' })
        .sort({ sentAt: -1 })
        .select('to subject sentAt')
        .lean(),
      AnalyticsEventLogModel.findOne({ status: 'sent' })
        .sort({ sentAt: -1 })
        .select('provider eventName sentAt')
        .lean(),
      appConfig.email.enabled
        ? emailService.verifyConnection().catch(() => false)
        : Promise.resolve(false),
    ]);

    return {
      gateways: {
        payhere: {
          name: 'PayHere',
          configured: Boolean(appConfig.payment.payhere.merchantId),
          enabled: appConfig.payment.payhere.merchantId !== 'dev-payhere-merchant-id',
          extra: { mode: appConfig.payment.payhere.mode },
        },
        koko: {
          name: 'Koko',
          configured: Boolean(appConfig.payment.koko.merchantId),
          enabled: appConfig.payment.koko.merchantId !== 'dev-koko-merchant-id',
          extra: { apiKeyConfigured: Boolean(appConfig.payment.koko.apiKey) },
        },
        mintpay: {
          name: 'Mintpay',
          configured: Boolean(appConfig.payment.mintpay.merchantId),
          enabled: appConfig.payment.mintpay.merchantId !== 'dev-mintpay-merchant-id',
          extra: { mode: appConfig.payment.mintpay.mode },
        },
        cod: {
          name: 'COD',
          configured: true,
          enabled: true,
        },
      },
      smtp: {
        name: 'SMTP / Email',
        configured: Boolean(appConfig.email.host && appConfig.email.user),
        enabled: appConfig.email.enabled ?? false,
        verified: smtpVerified,
        extra: {
          host: appConfig.email.host,
          port: appConfig.email.port,
          from: appConfig.email.fromEmail,
        },
      },
      analytics: {
        meta: {
          name: 'Meta Conversions API',
          configured: appConfig.analytics.meta.configured,
          enabled: appConfig.analytics.meta.configured,
          extra: { pixelIdConfigured: Boolean(appConfig.analytics.meta.pixelId) },
        },
        tiktok: {
          name: 'TikTok Events API',
          configured: appConfig.analytics.tiktok.configured,
          enabled: appConfig.analytics.tiktok.configured,
          extra: { pixelIdConfigured: Boolean(appConfig.analytics.tiktok.pixelId) },
        },
      },
      lastWebhook: lastWebhook
        ? {
            gateway: (lastWebhook as { gateway: string }).gateway,
            receivedAt: (lastWebhook as { createdAt: Date }).createdAt,
            status: (lastWebhook as { processingResult?: string }).processingResult ?? 'unknown',
          }
        : null,
      lastEmail: lastEmail
        ? {
            to: (lastEmail as { to: string }).to,
            subject: (lastEmail as { subject: string }).subject,
            sentAt: (lastEmail as { sentAt: Date }).sentAt,
          }
        : null,
      lastAnalyticsEvent: lastAnalyticsEvent
        ? {
            provider: (lastAnalyticsEvent as { provider: string }).provider,
            eventName: (lastAnalyticsEvent as { eventName: string }).eventName,
            sentAt: (lastAnalyticsEvent as { sentAt: Date }).sentAt,
          }
        : null,
    };
  }
}

export const integrationsStatusService = new IntegrationsStatusService();
