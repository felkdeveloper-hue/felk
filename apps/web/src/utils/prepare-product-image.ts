const MAX_EDGE = 1600;
const TARGET_BYTES = 900 * 1024;

function withExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'photo';
  return `${base}.${ext}`;
}

/**
 * Shrink a product photo in the browser before it is posted.
 * Phone pictures are often several megabytes; the API then decodes them on a
 * small server. A ~1600px JPEG stays under typical proxy limits and uploads
 * reliably.
 */
export async function prepareProductImage(file: File): Promise<File> {
  const looksLikeImage =
    file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name);
  if (!looksLikeImage) {
    throw new Error('Choose a JPG, PNG, or WEBP photo.');
  }

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return file;
  }
  if (file.type === 'image/gif' && file.size <= TARGET_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(
        'This photo is too large to upload. Export it as a JPG under 8 MB and try again.',
      );
    }
    return file;
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.82;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
      });
      if (!blob || blob.size <= TARGET_BYTES) break;
      quality = Math.max(0.45, quality - 0.1);
    }
    if (!blob) return file;
    if (blob.size >= file.size && scale === 1 && file.type === 'image/jpeg') return file;
    return new File([blob], withExtension(file.name, 'jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
