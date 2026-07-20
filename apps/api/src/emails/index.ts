export {
  welcomeEmail,
  verifyEmailTemplate,
  forgotPasswordEmail,
  passwordChangedEmail,
  loginAlertEmail,
  type EmailTemplate,
} from './templates/auth.templates';

export {
  orderConfirmationEmail,
  orderCancelledEmail,
  returnRequestedEmail,
  returnApprovedEmail,
  refundProcessedEmail,
  type OrderEmailData,
  type OrderLine,
} from './templates/order.templates';

export { paymentSuccessfulEmail, paymentFailedEmail } from './templates/payment.templates';

export { newsletterEmail } from './templates/marketing.templates';

export { lowStockAlertEmail, newOrderAlertEmail } from './templates/admin.templates';
