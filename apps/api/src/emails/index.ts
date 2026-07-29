export {
  welcomeEmail,
  verifyEmailTemplate,
  forgotPasswordEmail,
  passwordChangedEmail,
  loginAlertEmail,
  type EmailTemplate,
} from './templates/auth.templates.js';

export {
  orderConfirmationEmail,
  orderCancelledEmail,
  returnRequestedEmail,
  returnApprovedEmail,
  refundProcessedEmail,
  orderStatusUpdateEmail,
  type OrderEmailData,
  type OrderLine,
  type OrderStatusUpdateEmailData,
  type NotifiableOrderStatus,
} from './templates/order.templates.js';

export { paymentSuccessfulEmail, paymentFailedEmail } from './templates/payment.templates.js';

export { newsletterEmail } from './templates/marketing.templates.js';

export { lowStockAlertEmail, newOrderAlertEmail } from './templates/admin.templates.js';
