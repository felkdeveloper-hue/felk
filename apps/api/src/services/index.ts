export type {
  EmailService,
  SendEmailInput,
  EmailAttachment,
} from '@/services/interfaces/email.service.js';
export type {
  StorageService,
  StorageUploadInput,
  StorageObject,
} from '@/services/interfaces/storage.service.js';
export type {
  NotificationService,
  NotificationPayload,
} from '@/services/interfaces/notification.service.js';
export type { QueueService, QueueJob } from '@/services/interfaces/queue.service.js';
export type {
  PaymentGateway,
  CreatePaymentSessionInput,
  PaymentSessionResult,
  WebhookVerificationInput,
} from '@/services/interfaces/payment-gateway.service.js';

export { emailService, CentralizedEmailService, trySendEmail } from '@/services/email.service.js';
export { emailQueueService } from '@/services/email-queue.service.js';
export { authService, setAuthCookies, clearAuthCookies } from '@/services/auth.service.js';
export { writeAuditLog, writeActivityLog } from '@/services/audit.service.js';
export {
  getPermissionsForRole,
  invalidateRolePermissionCache,
  findRoleByKey,
  userHasPermission,
  userHasRole,
} from '@/services/rbac.service.js';
export {
  signAccessToken,
  verifyAccessToken,
  createOpaqueRefreshToken,
  blacklistAccessToken,
  isAccessTokenBlacklisted,
} from '@/services/token.service.js';
export { googleOAuthService, GoogleOAuthStub } from '@/services/oauth/google.oauth.js';
export { productService } from '@/services/product.service.js';
export { productVariantService } from '@/services/product-variant.service.js';
export { productMediaService } from '@/services/product-media.service.js';
export { productRelationshipService } from '@/services/product-relationship.service.js';
export {
  productAttributeService,
  attributeValueService,
} from '@/services/product-attribute.service.js';
export { localStorageService, LocalStorageService } from '@/services/local-storage.service.js';
export { S3StorageService } from '@/services/s3-storage.service.js';
export { storageService } from '@/services/storage.factory.js';
export { inventoryService } from '@/services/inventory.service.js';
export { warehouseService } from '@/services/warehouse.service.js';
export { reservationService } from '@/services/reservation.service.js';
export { supplierService } from '@/services/supplier.service.js';
export { purchaseOrderService } from '@/services/purchase-order.service.js';
export { transferService } from '@/services/transfer.service.js';
export { inventoryAlertService } from '@/services/inventory-alert.service.js';
export { customerService } from '@/services/customer.service.js';
export { customerAddressService } from '@/services/customer-address.service.js';
export { wishlistService } from '@/services/wishlist.service.js';
export { recentlyViewedService, savedItemService } from '@/services/recently-viewed.service.js';
export { rewardService, referralService } from '@/services/reward.service.js';
export { customerNoteService, customerTagService } from '@/services/customer-notes-tags.service.js';
export { cartService, extractGuestToken } from '@/services/cart.service.js';
export { checkoutService } from '@/services/checkout.service.js';
export { paymentService } from '@/services/payment.service.js';
export { refundService } from '@/services/refund.service.js';
export { getGateway, isKnownGateway } from '@/services/gateways/registry.js';
export { publishPaymentEvent } from '@/services/payment-event-publisher.js';
export { writePaymentLog } from '@/services/payment-log.service.js';
export { domainEventBus } from '@/services/events/event-bus.js';
export { orderService } from '@/services/order.service.js';
export { invoiceService } from '@/services/invoice.service.js';
export { returnService } from '@/services/return.service.js';
export { recordOrderTimeline } from '@/services/order-timeline.service.js';
export { publishOrderEvent } from '@/services/order-event-publisher.js';
export {
  handlePaymentSucceededEvent,
  initOrderPaymentConsumer,
  catchUpUnconsumedPaymentEvents,
  catchUpOrphanPaidGatewayPayments,
  recoverConfirmedMintpayOrders,
  recoverConfirmedKokoOrders,
  voidUnverifiedKokoAutoOrders,
} from '@/services/order-payment-consumer.service.js';
