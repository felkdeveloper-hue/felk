import { Types } from 'mongoose';
import { CmsPageModel } from '@/models/cms-content.models';
import { CmsCrudService, type ActorMeta } from '@/services/cms-crud.service';
import { sanitizeRichText } from '@/utils/sanitize-html';

class PageService extends CmsCrudService {
  constructor() {
    super(
      'pages',
      CmsPageModel,
      ['title', 'slug', 'excerpt'],
      ['createdAt', 'updatedAt', 'title', 'publishAt'],
    );
  }

  override async create(payload: Record<string, unknown>, actor: ActorMeta) {
    if (typeof payload.content === 'string') {
      payload.content = sanitizeRichText(payload.content);
    }
    payload.authorId = actor.userId ? new Types.ObjectId(actor.userId) : null;
    payload.version = 1;
    payload.versions = [
      {
        version: 1,
        title: String(payload.title),
        content: String(payload.content ?? ''),
        savedAt: new Date(),
        savedBy: actor.userId ? new Types.ObjectId(actor.userId) : null,
      },
    ];
    return super.create(payload, actor);
  }

  override async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const current = await this.getById(id);

    if (typeof payload.content === 'string') {
      payload.content = sanitizeRichText(payload.content);
    }

    const nextVersion = (current.version ?? 1) + 1;
    const versionEntry = {
      version: nextVersion,
      title: String(payload.title ?? current.title),
      content: String(payload.content ?? current.content),
      savedAt: new Date(),
      savedBy: actor.userId ? new Types.ObjectId(actor.userId) : null,
    };

    payload.version = nextVersion;
    payload.versions = [...(current.versions ?? []), versionEntry].slice(-50);

    return super.update(id, payload, actor);
  }
}

export const pageService = new PageService();
