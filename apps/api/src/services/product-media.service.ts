import { randomUUID } from 'node:crypto';
import { ProductMediaModel } from '@/models/product.models';
import { productRepository } from '@/repositories/product.repository';
import { storageService } from '@/services/storage.factory';
import { writeAuditLog } from '@/services/audit.service';
import type { ActorMeta } from '@/services/cms-crud.service';
import { ApiError } from '@/utils/errors/api-error';
import { getImageMetadata, processImage } from '@/utils/image.helper';
import { MEDIA_TYPES, PRODUCT_AUDIT } from '@/constants/product';

export class ProductMediaService {
  async list(productId: string) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');
    return ProductMediaModel.find({ productId, isDeleted: false }).sort({
      priority: 1,
      createdAt: 1,
    });
  }

  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    meta: {
      alt?: string;
      priority?: number;
      isPrimary?: boolean;
      isThumbnail?: boolean;
      isGallery?: boolean;
      variantId?: string | null;
      type?: string;
    },
    actor: ActorMeta,
  ) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    const type = meta.type ?? MEDIA_TYPES.IMAGE;
    const isVideo = type === MEDIA_TYPES.VIDEO || file.mimetype.startsWith('video/');

    let url: string;
    let key: string;
    let thumbnailUrl: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let sizeBytes = file.size;
    let mimeType = file.mimetype;

    if (isVideo) {
      key = `products/${productId}/videos/${randomUUID()}-${file.originalname}`;
      const stored = await storageService.upload({
        key,
        body: file.buffer,
        contentType: file.mimetype,
        isPublic: true,
      });
      url = stored.url;
    } else {
      const webp = await processImage(file.buffer, {
        width: 1600,
        quality: 82,
        format: 'webp',
      });
      const thumb = await processImage(file.buffer, {
        width: 400,
        quality: 75,
        format: 'webp',
      });
      const metadata = await getImageMetadata(webp);
      width = metadata.width ?? null;
      height = metadata.height ?? null;
      sizeBytes = webp.length;
      mimeType = 'image/webp';

      const id = randomUUID();
      key = `products/${productId}/images/${id}.webp`;
      const thumbKey = `products/${productId}/images/${id}-thumb.webp`;

      const [stored, storedThumb] = await Promise.all([
        storageService.upload({
          key,
          body: webp,
          contentType: 'image/webp',
          isPublic: true,
        }),
        storageService.upload({
          key: thumbKey,
          body: thumb,
          contentType: 'image/webp',
          isPublic: true,
        }),
      ]);
      url = stored.url;
      thumbnailUrl = storedThumb.url;
    }

    if (meta.isPrimary) {
      await ProductMediaModel.updateMany(
        { productId, isDeleted: false },
        { $set: { isPrimary: false } },
      );
    }
    if (meta.isThumbnail) {
      await ProductMediaModel.updateMany(
        { productId, isDeleted: false },
        { $set: { isThumbnail: false } },
      );
    }

    const media = await ProductMediaModel.create({
      productId,
      variantId: meta.variantId ?? null,
      type: isVideo ? MEDIA_TYPES.VIDEO : type,
      url,
      key,
      thumbnailUrl,
      alt: meta.alt ?? product.name,
      mimeType,
      width,
      height,
      sizeBytes,
      priority: meta.priority ?? 0,
      isPrimary: Boolean(meta.isPrimary),
      isThumbnail: Boolean(meta.isThumbnail),
      isGallery: meta.isGallery !== false,
    });

    await writeAuditLog({
      action: PRODUCT_AUDIT.MEDIA_ADDED,
      resourceType: 'product_media',
      resourceId: media._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: media.toObject() as Record<string, unknown>,
      metadata: { productId },
    });

    return media;
  }

  /** Register remote/CDN media without binary upload. */
  async createRemote(productId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound('Product not found');

    if (payload.isPrimary) {
      await ProductMediaModel.updateMany(
        { productId, isDeleted: false },
        { $set: { isPrimary: false } },
      );
    }

    const media = await ProductMediaModel.create({
      productId,
      variantId: payload.variantId ?? null,
      type: payload.type ?? MEDIA_TYPES.IMAGE,
      url: payload.url,
      key: payload.key ?? null,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      alt: payload.alt ?? product.name,
      mimeType: payload.mimeType ?? null,
      width: payload.width ?? null,
      height: payload.height ?? null,
      sizeBytes: payload.sizeBytes ?? null,
      priority: payload.priority ?? 0,
      isPrimary: Boolean(payload.isPrimary),
      isThumbnail: Boolean(payload.isThumbnail),
      isGallery: payload.isGallery !== false,
    });

    await writeAuditLog({
      action: PRODUCT_AUDIT.MEDIA_ADDED,
      resourceType: 'product_media',
      resourceId: media._id.toString(),
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      after: media.toObject() as Record<string, unknown>,
      metadata: { productId, remote: true },
    });

    return media;
  }

  async update(mediaId: string, payload: Record<string, unknown>, actor: ActorMeta) {
    const before = await ProductMediaModel.findOne({ _id: mediaId, isDeleted: false });
    if (!before) throw ApiError.notFound('Media not found');

    if (payload.isPrimary) {
      await ProductMediaModel.updateMany(
        { productId: before.productId, isDeleted: false },
        { $set: { isPrimary: false } },
      );
    }
    if (payload.isThumbnail) {
      await ProductMediaModel.updateMany(
        { productId: before.productId, isDeleted: false },
        { $set: { isThumbnail: false } },
      );
    }

    const media = await ProductMediaModel.findOneAndUpdate(
      { _id: mediaId, isDeleted: false },
      { $set: payload },
      { new: true },
    );

    await writeAuditLog({
      action: 'products.media_updated',
      resourceType: 'product_media',
      resourceId: mediaId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
      after: media?.toObject() as Record<string, unknown>,
    });

    return media;
  }

  async remove(mediaId: string, actor: ActorMeta) {
    const before = await ProductMediaModel.findOne({ _id: mediaId, isDeleted: false });
    if (!before) throw ApiError.notFound('Media not found');

    const media = await ProductMediaModel.findOneAndUpdate(
      { _id: mediaId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    if (before.key) {
      await storageService.delete(before.key);
      if (before.key.endsWith('.webp') && !before.key.includes('-thumb.webp')) {
        await storageService
          .delete(before.key.replace(/\.webp$/, '-thumb.webp'))
          .catch(() => undefined);
      }
    }

    await writeAuditLog({
      action: 'products.media_deleted',
      resourceType: 'product_media',
      resourceId: mediaId,
      actorUserId: actor.userId,
      ip: actor.ip,
      requestId: actor.requestId,
      before: before.toObject() as Record<string, unknown>,
    });

    return media;
  }
}

export const productMediaService = new ProductMediaService();
