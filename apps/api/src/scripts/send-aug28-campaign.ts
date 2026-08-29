/**
 * One-off segmented campaign (Aug 28, 2026):
 * - Apology email + in-app notification ONLY for users who signed up today AND reached checkout
 * - Offer email for all other customers with real email addresses
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/send-aug28-campaign.ts --dry-run
 *   pnpm exec tsx src/scripts/send-aug28-campaign.ts
 */
import { connectDatabase } from '@/config/database.js';
import { appConfig } from '@/config/app.config.js';
import { logger } from '@/config/logger.js';
import { ROLES } from '@/constants/roles.js';
import {
  CheckoutSessionModel,
  CustomerModel,
  EmailLogModel,
  UserModel,
} from '@/models/index.js';
import { EventModel } from '@/models/analytics/event.model.js';
import { checkoutApologyEmail, siteWideOfferEmail } from '@/emails/templates/marketing.templates.js';
import { emailQueueService } from '@/services/email-queue.service.js';
import { notificationService } from '@/services/notification.service.js';

const CAMPAIGN_DATE = '2026-08-28';
const APOLOGY_TEMPLATE_KEY = 'checkout_apology_aug28';
const OFFER_TEMPLATE_KEY = 'site_offer_aug28';
const NOTIFICATION_CAMPAIGN_KEY = 'checkout_apology_aug28';
const CHECKOUT_EVENTS = [
  'checkout_started',
  'checkout_shipping_reached',
  'payment_page_reached',
  'checkout_review_reached',
] as const;

const dryRun = process.argv.includes('--dry-run');
const shopUrl = appConfig.email.shopUrl;

function getColomboDayBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
}

function isRealEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return Boolean(normalized) && !normalized.endsWith('@guest.fe.lk');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function alreadySent(templateKey: string, email: string) {
  const existing = await EmailLogModel.findOne({
    templateKey,
    to: email,
    status: { $in: ['sent', 'pending', 'retrying'] },
  })
    .select('_id')
    .lean();
  return Boolean(existing);
}

await connectDatabase();

const { start: dayStart, end: dayEnd } = getColomboDayBounds(CAMPAIGN_DATE);

logger.info({ dayStart, dayEnd, dryRun }, 'Starting Aug 28 campaign');

const todayUsers = await UserModel.find({
  roleKey: ROLES.CUSTOMER,
  isDeleted: false,
  createdAt: { $gte: dayStart, $lte: dayEnd },
})
  .select('_id email firstName lastName createdAt')
  .lean();

const todayUserIds = todayUsers.map((u) => u._id);

const [checkoutEventUserIds, checkoutSessionUserIds] = await Promise.all([
  EventModel.distinct('userId', {
    userId: { $in: todayUserIds },
    name: { $in: [...CHECKOUT_EVENTS] },
  }),
  CheckoutSessionModel.distinct('userId', {
    userId: { $in: todayUserIds },
    isDeleted: false,
  }),
]);

const apologyUserIdSet = new Set<string>();
for (const id of checkoutEventUserIds) {
  if (id) apologyUserIdSet.add(String(id));
}
for (const id of checkoutSessionUserIds) {
  if (id) apologyUserIdSet.add(String(id));
}

const apologyUsers = todayUsers.filter((u) => apologyUserIdSet.has(String(u._id)));
const apologyEmails = new Set(
  apologyUsers.map((u) => u.email.trim().toLowerCase()).filter(isRealEmail),
);

const apologyCustomers = await CustomerModel.find({
  userId: { $in: apologyUsers.map((u) => u._id) },
  isDeleted: false,
})
  .select('_id userId email firstName lastName')
  .lean();

const offerCustomers = await CustomerModel.find({
  isDeleted: false,
  email: { $not: /@guest\.fe\.lk$/i },
})
  .select('_id userId email firstName lastName')
  .lean();

const offerTargets = offerCustomers.filter(
  (c) => isRealEmail(c.email) && !apologyEmails.has(c.email.trim().toLowerCase()),
);

const summary = {
  dryRun,
  campaignDate: CAMPAIGN_DATE,
  todaySignups: todayUsers.length,
  apologyUsers: apologyUsers.length,
  apologyCustomers: apologyCustomers.length,
  offerTargets: offerTargets.length,
  apologySample: apologyUsers.slice(0, 5).map((u) => u.email),
  offerSample: offerTargets.slice(0, 5).map((c) => c.email),
};

console.log(JSON.stringify(summary, null, 2));

if (dryRun) {
  logger.info(summary, 'Dry run complete — no emails sent');
  process.exit(0);
}

let apologyEmailsSent = 0;
let apologyEmailsSkipped = 0;
let offerEmailsSent = 0;
let offerEmailsSkipped = 0;

for (const user of apologyUsers) {
  if (!isRealEmail(user.email)) continue;

  if (await alreadySent(APOLOGY_TEMPLATE_KEY, user.email)) {
    apologyEmailsSkipped += 1;
    continue;
  }

  const tpl = checkoutApologyEmail({
    name: user.firstName || undefined,
    shopUrl,
  });

  await emailQueueService.enqueue({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateKey: APOLOGY_TEMPLATE_KEY,
  });
  apologyEmailsSent += 1;
  await sleep(300);
}

const notificationInputs = apologyCustomers
  .filter((c) => c.userId)
  .map((c) => ({
    userId: String(c.userId),
    customerId: String(c._id),
    title: 'We’re sorry — your 20% off is back',
    message:
      'There was a small bug on our side during checkout today, and we’re truly sorry. When you visit again and sign in, your 20% off will be activated automatically.',
    severity: 'warning' as const,
    linkUrl: shopUrl,
    linkLabel: 'Shop now',
    campaignKey: NOTIFICATION_CAMPAIGN_KEY,
  }));

const notificationResult = await notificationService.createBulk(notificationInputs);

await CustomerModel.updateMany(
  { _id: { $in: apologyCustomers.map((c) => c._id) } },
  {
    $set: {
      flashSaleStartTime: null,
      'metadata.apologyFlashSalePending': true,
      'metadata.checkoutApologySentAt': new Date().toISOString(),
    },
  },
);

for (const customer of offerTargets) {
  if (await alreadySent(OFFER_TEMPLATE_KEY, customer.email)) {
    offerEmailsSkipped += 1;
    continue;
  }

  const tpl = siteWideOfferEmail({
    name: customer.firstName || undefined,
    shopUrl,
  });

  await emailQueueService.enqueue({
    to: customer.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateKey: OFFER_TEMPLATE_KEY,
  });
  offerEmailsSent += 1;
  await sleep(300);
}

const result = {
  ...summary,
  apologyEmailsSent,
  apologyEmailsSkipped,
  offerEmailsSent,
  offerEmailsSkipped,
  notificationsCreated: notificationResult.created,
  notificationsSkipped: notificationResult.skipped,
};

console.log(JSON.stringify(result, null, 2));
logger.info(result, 'Aug 28 campaign finished');
process.exit(0);
