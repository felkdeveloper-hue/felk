import sanitizeHtml from 'sanitize-html';

const DEFAULT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'h1',
    'h2',
    'span',
    'figure',
    'figcaption',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height'],
    a: ['href', 'name', 'target', 'rel'],
    '*': ['class', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

export function sanitizeRichText(html: string | undefined | null): string | undefined {
  if (html == null) return undefined;
  return sanitizeHtml(html, DEFAULT_OPTIONS);
}
