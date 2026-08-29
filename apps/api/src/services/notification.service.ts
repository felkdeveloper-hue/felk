import { Types } from 'mongoose';
import { NotificationModel, type NotificationSeverity } from '@/models/notification.model.js';
import { ApiError } from '@/utils/errors/api-error.js';

export interface CreateNotificationInput {
  userId: string;
  customerId?: string | null;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  linkUrl?: string | null;
  linkLabel?: string | null;
  campaignKey?: string | null;
}

function serializeNotification(doc: {
  _id: Types.ObjectId;
  title: string;
  message: string;
  severity: NotificationSeverity;
  linkUrl?: string | null;
  linkLabel?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    message: doc.message,
    severity: doc.severity,
    linkUrl: doc.linkUrl ?? null,
    linkLabel: doc.linkLabel ?? null,
    isRead: doc.isRead,
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class NotificationService {
  async listForUser(userId: string, limit = 20) {
    const rows = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return rows.map((row) =>
      serializeNotification({
        _id: row._id,
        title: row.title,
        message: row.message,
        severity: row.severity,
        linkUrl: row.linkUrl,
        linkLabel: row.linkLabel,
        isRead: row.isRead,
        readAt: row.readAt,
        createdAt: row.createdAt,
      }),
    );
  }

  async unreadCount(userId: string) {
    return NotificationModel.countDocuments({ userId, isRead: false });
  }

  async create(input: CreateNotificationInput) {
    const doc = await NotificationModel.create({
      userId: input.userId,
      customerId: input.customerId ?? null,
      title: input.title,
      message: input.message,
      severity: input.severity ?? 'info',
      linkUrl: input.linkUrl ?? null,
      linkLabel: input.linkLabel ?? null,
      campaignKey: input.campaignKey ?? null,
    });

    return serializeNotification(doc);
  }

  async createBulk(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return { created: 0, skipped: 0 };

    let created = 0;
    let skipped = 0;

    for (const input of inputs) {
      try {
        await NotificationModel.create({
          userId: input.userId,
          customerId: input.customerId ?? null,
          title: input.title,
          message: input.message,
          severity: input.severity ?? 'info',
          linkUrl: input.linkUrl ?? null,
          linkLabel: input.linkLabel ?? null,
          campaignKey: input.campaignKey ?? null,
        });
        created += 1;
      } catch (err) {
        const code = (err as { code?: number }).code;
        if (code === 11000) {
          skipped += 1;
          continue;
        }
        throw err;
      }
    }

    return { created, skipped };
  }

  async markRead(userId: string, notificationId: string) {
    const doc = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );

    if (!doc) throw ApiError.notFound('Notification not found');
    return serializeNotification(doc);
  }

  async markAllRead(userId: string) {
    const result = await NotificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
    return { modifiedCount: result.modifiedCount };
  }
}

export const notificationService = new NotificationService();
