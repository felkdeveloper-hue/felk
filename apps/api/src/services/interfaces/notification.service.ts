import type { NotificationType } from '@/constants/notification-types';

/**
 * Notification fan-out contract — interface only.
 */
export interface NotificationPayload {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: Array<'in_app' | 'email' | 'sms' | 'push'>;
}

export interface NotificationService {
  notify(payload: NotificationPayload): Promise<void>;
  notifyMany(payloads: NotificationPayload[]): Promise<void>;
}
