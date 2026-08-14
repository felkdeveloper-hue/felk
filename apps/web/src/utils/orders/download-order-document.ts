import { httpClient } from '@/lib/http-client';

export async function downloadOrderDocument(url: string, fallbackFileName: string): Promise<void> {
  const response = await httpClient.get<Blob>(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="([^"]+)"/i);
  const fileName = match?.[1] ?? fallbackFileName;
  const blob = response.data;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
