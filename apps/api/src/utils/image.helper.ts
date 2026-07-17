import sharp from 'sharp';

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
}

/**
 * Image processing helper (Sharp). Pure transform — no storage I/O.
 */
export async function processImage(
  input: Buffer,
  options: ImageProcessOptions = {},
): Promise<Buffer> {
  const { width, height, quality = 80, format = 'webp' } = options;

  let pipeline = sharp(input).rotate();

  if (width || height) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality }).toBuffer();
    case 'png':
      return pipeline.png().toBuffer();
    case 'avif':
      return pipeline.avif({ quality }).toBuffer();
    case 'webp':
    default:
      return pipeline.webp({ quality }).toBuffer();
  }
}

export async function getImageMetadata(input: Buffer) {
  return sharp(input).metadata();
}
