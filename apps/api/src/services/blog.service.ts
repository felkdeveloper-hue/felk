import { Types } from 'mongoose';
import { BlogPostModel } from '@/models/cms-content.models';
import { CmsCrudService, type ActorMeta } from '@/services/cms-crud.service';
import { sanitizeRichText } from '@/utils/sanitize-html';
import { ApiError } from '@/utils/errors/api-error';

class BlogService extends CmsCrudService {
  constructor() {
    super(
      'blogs',
      BlogPostModel,
      ['title', 'slug', 'excerpt', 'tags'],
      ['createdAt', 'updatedAt', 'title', 'publishAt'],
    );
  }

  override async create(payload: Record<string, unknown>, actor: ActorMeta) {
    if (typeof payload.content === 'string') {
      payload.content = sanitizeRichText(payload.content);
    }
    payload.authorId = actor.userId ? new Types.ObjectId(actor.userId) : null;
    return super.create(payload, actor);
  }

  override async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    if (typeof payload.content === 'string') {
      payload.content = sanitizeRichText(payload.content);
    }
    return super.update(id, payload, actor);
  }

  async publish(id: string, actor: ActorMeta) {
    return this.update(
      id,
      {
        status: 'published',
        publishAt: new Date(),
      },
      actor,
    );
  }

  async schedule(id: string, publishAt: Date, actor: ActorMeta) {
    if (publishAt.getTime() <= Date.now()) {
      throw ApiError.badRequest('publishAt must be in the future');
    }
    return this.update(id, { status: 'scheduled', publishAt }, actor);
  }
}

export const blogService = new BlogService();
