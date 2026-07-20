import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { CategoryModel } from '@/models/master-data.models';
import { CmsCrudService, type ActorMeta } from '@/services/cms-crud.service';
import { storageService } from '@/services/storage.factory';
import { ApiError } from '@/utils/errors/api-error';
import { processImage } from '@/utils/image.helper';
import { slugify } from '@/utils/slug.helper';

class CategoryService extends CmsCrudService {
  constructor() {
    super(
      'categories',
      CategoryModel,
      ['name', 'slug', 'path'],
      ['createdAt', 'updatedAt', 'name', 'sortOrder', 'depth'],
    );
  }

  private async buildPath(parentId: string | null | undefined, slug: string) {
    if (!parentId) {
      return { path: `/${slug}`, depth: 0 };
    }

    const parent = await CategoryModel.findOne({ _id: parentId, isDeleted: false });
    if (!parent) {
      throw ApiError.badRequest('Parent category not found', undefined, 'INVALID_PARENT');
    }
    if (parent.depth >= 3) {
      throw ApiError.badRequest('Maximum category depth exceeded', undefined, 'MAX_DEPTH');
    }

    return { path: `${parent.path}/${slug}`, depth: parent.depth + 1 };
  }

  override async create(payload: Record<string, unknown>, actor: ActorMeta) {
    const name = String(payload.name);
    const slug = payload.slug ? String(payload.slug) : slugify(name);
    const parentId = (payload.parentId as string | null | undefined) ?? null;
    const { path, depth } = await this.buildPath(parentId, slug);

    return super.create(
      {
        ...payload,
        slug,
        parentId: parentId ? new Types.ObjectId(parentId) : null,
        path,
        depth,
      },
      actor,
    );
  }

  override async update(id: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const current = await this.getById(id);
    const slug = payload.slug ? String(payload.slug) : current.slug;
    const parentId =
      payload.parentId !== undefined
        ? (payload.parentId as string | null)
        : (current.parentId?.toString() ?? null);

    if (parentId === id) {
      throw ApiError.badRequest('Category cannot be its own parent');
    }

    const { path, depth } = await this.buildPath(parentId, slug);

    return super.update(
      id,
      {
        ...payload,
        slug,
        parentId: parentId ? new Types.ObjectId(parentId) : null,
        path,
        depth,
      },
      actor,
    );
  }

  async tree() {
    const items = await CategoryModel.find({ isDeleted: false, status: { $ne: 'archived' } })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    type Node = (typeof items)[number] & { children: Node[] };
    const map = new Map<string, Node>();
    const roots: Node[] = [];

    for (const item of items) {
      map.set(String(item._id), { ...item, children: [] });
    }

    for (const item of items) {
      const node = map.get(String(item._id))!;
      if (item.parentId) {
        const parent = map.get(String(item.parentId));
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async uploadImage(id: string, file: Express.Multer.File, actor: ActorMeta, alt?: string) {
    await this.getById(id);

    const webp = await processImage(file.buffer, {
      width: 1200,
      height: 1600,
      quality: 82,
      format: 'webp',
    });
    const key = `categories/${id}/${randomUUID()}.webp`;
    const stored = await storageService.upload({
      key,
      body: webp,
      contentType: 'image/webp',
    });

    return this.update(
      id,
      {
        image: {
          url: stored.url,
          key: stored.key ?? key,
          alt: alt?.trim() || file.originalname || 'Category image',
        },
      },
      actor,
    );
  }
}

export const categoryService = new CategoryService();
