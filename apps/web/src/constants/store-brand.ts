/** House brand shown on every admin product by default. */
export const OFFICIAL_BRAND_NAME = 'FE.LK OFFICIAL';
export const OFFICIAL_BRAND_SLUG = 'fe-lk-official';

export function findOfficialBrandId(
  brands: Array<{ id: string; name?: string; slug?: string }>,
): string {
  const match = brands.find((brand) => {
    const name = (brand.name ?? '').trim().toLowerCase();
    const slug = (brand.slug ?? '').trim().toLowerCase();
    return (
      slug === OFFICIAL_BRAND_SLUG ||
      name === OFFICIAL_BRAND_NAME.toLowerCase() ||
      name.includes('fe.lk') ||
      name.includes('fe lk')
    );
  });
  return match?.id ?? '';
}
