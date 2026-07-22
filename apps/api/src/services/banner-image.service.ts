import { randomUUID } from 'node:crypto';
import type { Model } from 'mongoose';
import { storageService } from '@/services/storage.factory';
import { ApiError } from '@/utils/errors/api-error';
import { processImage } from '@/utils/image.helper';

export async function uploadBannerDesktopImage(
  model: Model<any>,
  id: string,
  file: Express.Multer.File,
  folder: 'hero-banners' | 'promo-banners',
  alt?: string,
) {
  const doc = await model.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    throw ApiError.notFound('Banner not found');
  }

  const webp = await processImage(file.buffer, {
    width: 2400,
    height: 1600,
    quality: 85,
    format: 'webp',
  });
  const key = `${folder}/${id}/${randomUUID()}.webp`;
  const stored = await storageService.upload({
    key,
    body: webp,
    contentType: 'image/webp',
  });

  const image = {
    url: stored.url,
    key: stored.key ?? key,
    alt: alt?.trim() || file.originalname || 'Banner image',
  };

  doc.set('images', {
    desktop: image,
    tablet: image,
    mobile: image,
  });
  await doc.save();
  return doc.toObject();
}
