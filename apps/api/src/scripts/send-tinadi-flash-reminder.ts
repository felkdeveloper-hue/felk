/**
 * One-off: Tinadi Perera only — 20 minutes flash sale left, email, in-app
 * notification, and a one-time +15 minute return bonus on next site visit.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/send-tinadi-flash-reminder.ts --dry-run
 *   pnpm exec tsx src/scripts/send-tinadi-flash-reminder.ts
 */
import { connectDatabase } from '@/config/database.js';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { FLASH_SALE_DISCOUNT } from '@/constants/checkout.js';
import { flashSaleMinutesLeftEmail } from '@/emails/templates/marketing.templates.js';
import { CustomerModel, UserModel } from '@/models/index.js';
import { emailQueueService } from '@/services/email-queue.service.js';
import { notificationService } from '@/services/notification.service.js';

const TARGET_EMAIL = 'pereratinadi@gmail.com';
const MINUTES_LEFT = 20;
const RETURN_BONUS_MS = 15 * 60 * 1000;
const TEMPLATE_KEY = 'flash_reminder_tinadi_aug29';
const NOTIFICATION_CAMPAIGN_KEY = 'flash_reminder_tinadi_aug29';

const dryRun = process.argv.includes('--dry-run');
const shopUrl = appConfig.email.shopUrl;

await connectDatabase();

const email = TARGET_EMAIL.toLowerCase();
const user = await UserModel.findOne({ email, isDeleted: false }).lean();
if (!user) {
  throw new Error(`User not found for ${email}`);
}

const customer = await CustomerModel.findOne({
  $or: [{ userId: user._id }, { email }],
  isDeleted: false,
});
if (!customer) {
  throw new Error(`Customer profile not found for ${email}`);
}

const firstName = customer.firstName || user.firstName || 'Tinadi';
const remainingMs = MINUTES_LEFT * 60 * 1000;
const flashSaleStartTime = new Date(Date.now() - (FLASH_SALE_DISCOUNT.DURATION_MS - remainingMs));
const expiresAt = new Date(flashSaleStartTime.getTime() + FLASH_SALE_DISCOUNT.DURATION_MS);

logger.info(
  {
    dryRun,
    userId: user._id.toString(),
    customerId: customer._id.toString(),
    email,
    flashSaleStartTime: flashSaleStartTime.toISOString(),
    expiresAt: expiresAt.toISOString(),
    returnBonusMinutes: RETURN_BONUS_MS / 60_000,
  },
  'Tinadi flash reminder — preparing',
);

if (dryRun) {
  logger.info('Dry run complete — no writes or sends');
  process.exit(0);
}

await CustomerModel.updateOne(
  { _id: customer._id },
  {
    $set: {
      flashSaleStartTime,
      'metadata.returnFlashSaleBonusPending': true,
      'metadata.returnFlashSaleBonusMs': RETURN_BONUS_MS,
      'metadata.returnFlashSaleBonusNote': 'tinadi_personal_aug29',
    },
  },
);

const tpl = flashSaleMinutesLeftEmail({
  name: firstName,
  minutesLeft: MINUTES_LEFT,
  shopUrl,
});

const emailResult = await emailQueueService.enqueue({
  to: email,
  subject: tpl.subject,
  html: tpl.html,
  text: tpl.text,
  templateKey: TEMPLATE_KEY,
});

const notification = await notificationService.create({
  userId: user._id.toString(),
  customerId: customer._id.toString(),
  title: `Only ${MINUTES_LEFT} minutes left — 20% off`,
  message:
    'Your member 20% off on every eligible product is about to expire. Shop now before the timer runs out. When you return to the site, we will add 15 more minutes just for you.',
  severity: 'success',
  linkUrl: shopUrl,
  linkLabel: 'Shop 20% off now',
  campaignKey: NOTIFICATION_CAMPAIGN_KEY,
});

logger.info(
  {
    emailLogId: emailResult.logId,
    messageId: emailResult.messageId,
    notificationId: notification.id,
    expiresAt: expiresAt.toISOString(),
  },
  'Tinadi flash reminder — sent',
);

process.exit(0);
