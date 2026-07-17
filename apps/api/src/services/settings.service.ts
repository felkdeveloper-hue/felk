import { StoreSettingModel } from '@/models/settings.models';
import { writeActivityLog, writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { decryptSecret, encryptSecret, maskSecret } from '@/utils/crypto.helper';

function redactSetting(doc: Record<string, unknown>) {
  if (doc.isEncrypted || doc.type === 'secret') {
    return { ...doc, value: maskSecret(doc.value) };
  }
  return doc;
}

export const settingsService = {
  async list(group?: string, includeSecrets = false) {
    const filter: Record<string, unknown> = { isDeleted: false };
    if (group) filter.group = group;

    const rows = await StoreSettingModel.find(filter).sort({ key: 1 }).lean();
    return rows.map((row) => {
      const plain = row as Record<string, unknown>;
      if (!includeSecrets && (plain.isEncrypted || plain.type === 'secret')) {
        return redactSetting(plain);
      }
      if (includeSecrets && typeof plain.value === 'string' && plain.value.startsWith('enc:')) {
        return { ...plain, value: decryptSecret(plain.value) };
      }
      return plain;
    });
  },

  async getPublic() {
    const rows = await StoreSettingModel.find({ isDeleted: false, isPublic: true }).lean();
    return rows.map((r) => ({ key: r.key, value: r.value, group: r.group }));
  },

  async upsert(input: Record<string, unknown>, actor: ActorMeta) {
    const key = String(input.key);
    let value = input.value;
    const isEncrypted = Boolean(input.isEncrypted) || input.type === 'secret';

    if (isEncrypted && typeof value === 'string' && !value.startsWith('enc:')) {
      value = encryptSecret(value);
    }

    const existing = await StoreSettingModel.findOne({ key });
    const payload = {
      key,
      value,
      type: input.type ?? existing?.type ?? 'string',
      group: input.group ?? existing?.group ?? 'general',
      isPublic: input.isPublic ?? existing?.isPublic ?? false,
      isEncrypted,
      description: input.description ?? existing?.description ?? null,
      updatedBy: actor.userId ?? null,
      isDeleted: false,
      deletedAt: null,
    };

    const doc = await StoreSettingModel.findOneAndUpdate(
      { key },
      { $set: payload },
      { upsert: true, new: true },
    );

    await writeAuditLog({
      action: 'settings.upsert',
      resourceType: 'settings',
      resourceId: key,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: redactSetting(doc.toObject() as Record<string, unknown>),
    });

    await writeActivityLog({
      summary: `Upserted setting ${key}`,
      module: 'settings',
      actorUserId: actor.userId,
      ip: actor.ip,
    });

    return redactSetting(doc.toObject() as Record<string, unknown>);
  },

  async remove(key: string, actor: ActorMeta) {
    const doc = await StoreSettingModel.findOneAndUpdate(
      { key, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );
    if (!doc) throw ApiError.notFound('Setting not found');

    await writeAuditLog({
      action: 'settings.delete',
      resourceType: 'settings',
      resourceId: key,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
    });

    return { key, deleted: true };
  },
};
