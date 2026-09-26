import sharp from 'sharp';

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
}

// One photo at a time, no decoded-image cache. Parallel Sharp decodes on a
// small EC2 box were enough to exhaust memory and drop the upload connection.
sharp.cache(false);
sharp.concurrency(1);

let imageChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = imageChain.then(task, task);
  imageChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Image processing helper (Sharp). Pure transform — no storage I/O.
 * Calls are serialized so two staff uploads cannot decode at once.
 */
export function processImage(input: Buffer, options: ImageProcessOptions = {}): Promise<Buffer> {
  return enqueue(() => processImageNow(input, options));
}

async function processImageNow(input: Buffer, options: ImageProcessOptions): Promise<Buffer> {
  const { width, height, quality = 80, format = 'webp' } = options;

  let pipeline = sharp(input, {
    sequentialRead: true,
    limitInputPixels: 40_000_000,
    failOn: 'none',
    animated: false,
  }).rotate();

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
