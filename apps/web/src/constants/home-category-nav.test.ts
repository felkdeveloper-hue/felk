import { describe, expect, it } from 'vitest';
import { FE_BASICS_SLUG } from '@/constants/fe-basics';
import { ensureFeBasicsHomeTiles, HOME_CATEGORY_NAV_ITEMS } from '@/constants/home-category-nav';

describe('ensureFeBasicsHomeTiles', () => {
  it('pins FE Basics first when the CMS list omits it', () => {
    const tiles = ensureFeBasicsHomeTiles([
      { label: 'TOPS', slug: 'all-tops', imageUrl: '/tops.png' },
      { label: 'PANTS', slug: 'pants', imageUrl: '/pants.png' },
    ]);
    expect(tiles[0]?.slug).toBe(FE_BASICS_SLUG);
    expect(tiles.map((tile) => tile.slug)).toEqual([
      FE_BASICS_SLUG,
      'all-tops',
      'pants',
    ]);
  });

  it('moves an existing FE Basics tile to the front without duplicating it', () => {
    const tiles = ensureFeBasicsHomeTiles([
      { label: 'TOPS', slug: 'all-tops', imageUrl: '/tops.png' },
      { label: 'FE Basics', slug: FE_BASICS_SLUG, imageUrl: '/custom.png' },
    ]);
    expect(tiles.filter((tile) => tile.slug === FE_BASICS_SLUG)).toHaveLength(1);
    expect(tiles[0]?.imageUrl).toBe('/custom.png');
  });

  it('keeps FE Basics first in the designed default list', () => {
    expect(HOME_CATEGORY_NAV_ITEMS[0]?.slug).toBe(FE_BASICS_SLUG);
  });
});
