export const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order.placed',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_FAILED: 'payment.failed',
  LOW_STOCK: 'inventory.low_stock',
  ACCOUNT_WELCOME: 'account.welcome',
  PASSWORD_RESET: 'account.password_reset',
  GENERIC: 'generic',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
} as const;
