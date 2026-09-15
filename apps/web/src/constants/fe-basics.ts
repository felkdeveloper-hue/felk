export const FE_BASICS_SLUG = 'fe-basics';
export const FE_BASICS_NAME = 'FE Basics';
export const FE_BASICS_TAGLINE = 'Factory made · Not imported';
export const FE_BASICS_DESCRIPTION =
  'Pieces we manufacture in our own factory — not imported. Everyday essentials, made here.';

export function isFeBasicsSlug(slug: string | undefined | null): boolean {
  return String(slug ?? '')
    .trim()
    .toLowerCase() === FE_BASICS_SLUG;
}
