/**

 * Deterministic seeded reviews for startup storefronts.

 * Keeps averages high while including some 3★ reviews for realism.

 */

export type SeededReview = {
  id: string;

  rating: number;

  title: string;

  body: string;

  author: string;

  createdAt: string;

  isVerifiedPurchase: boolean;
};

export type SeededReviewSummary = {
  average: number;

  total: number;

  recommendRate: number;

  distribution: Record<number, number>;
};

/** Top-viewed products get stronger social proof. */

const FEATURED_PRODUCT_NAMES = [
  'Reef Ruched Dress',

  'The Lily Bloom Top',

  'Monolith Laser-Cut Set',

  'Summery Floral Halter Top',

  'Sienna Ruched Off-Shoulder Top',

  'Postcard Escape Peplum Top',

  'Front Twist Flare Top',

  'Royal Luxe Scarf Top',

  'Ruched Off-Shoulder Top',

  'The Nova Crossover Top',

  'Ghost Pace',

  'The Capri Polka Dot Top',

  'Sneak Luxe',

  'Willow Tie-Front Top',
] as const;

/** Approved fake reviewer names — never use real customer names. */

const AUTHORS = [
  'Shenali Perera',

  'Dinithi Jayasinghe',

  'Thisari Fernando',

  'Kavindi Wijesinghe',

  'Senuri Gunawardena',

  'Nethmi Ranasinghe',

  'Oshadi Wickramasinghe',

  'Tharushi Ekanayake',

  'Reshani Samarasinghe',

  'Minoli Abeysekara',
] as const;

/** Large pool of unique review snippets — each product gets a distinct slice. */

const REVIEW_SNIPPETS = [
  {
    title: 'Perfect everyday piece',
    body: 'Fabric feels premium and the fit is true to size. Already planning a second colour.',
  },

  {
    title: 'Looks better in person',
    body: 'The detailing is lovely and it photographs beautifully. Arrived neatly folded.',
  },

  {
    title: 'Great quality',
    body: 'Stitching is clean and the silhouette flatters. Would recommend for weekend wear.',
  },

  {
    title: 'Soft and flattering',
    body: 'Comfortable all day. I sized as usual and it sits exactly how I hoped.',
  },

  {
    title: 'Repeat buy energy',
    body: 'Got compliments the first time I wore it. Packaging was neat too.',
  },

  {
    title: 'Solid purchase',
    body: 'Colour matches the photos. Slightly structured without feeling stiff.',
  },

  {
    title: 'Nice for the price',
    body: 'Overall happy — the cut is modern and easy to style with basics.',
  },

  {
    title: 'Almost perfect',
    body: 'Love the look. Wish it came in one more shade, but still a keeper.',
  },

  {
    title: 'Good, with a note',
    body: 'Quality is good. Runs a touch snug at the bust for me — next time I may size up.',
  },

  {
    title: 'Effortless styling',
    body: 'Pairs well with denim and heels. The drape is exactly what I wanted.',
  },

  {
    title: 'Worth the wait',
    body: 'Ordered on a whim and it exceeded expectations. Fabric has a lovely weight.',
  },

  {
    title: 'True to photos',
    body: 'Colour and texture match the listing. No surprises when it arrived.',
  },

  {
    title: 'Comfortable fit',
    body: 'Light enough for daytime but still feels polished for evenings out.',
  },

  {
    title: 'New favourite',
    body: 'Have worn it twice already. The cut is forgiving without looking oversized.',
  },

  {
    title: 'Clean finish',
    body: 'Seams lie flat and the neckline sits well. Feels thoughtfully made.',
  },

  {
    title: 'Easy to dress up',
    body: 'Works with sandals for brunch and boots for dinner. Very versatile.',
  },

  {
    title: 'Lovely material',
    body: 'Soft against the skin and breathable. Perfect for Sri Lankan weather.',
  },

  {
    title: 'Flattering shape',
    body: 'Accentuates the waist without feeling tight. Very happy with this pick.',
  },

  {
    title: 'Great first order',
    body: 'First time shopping here and impressed. Will browse again soon.',
  },

  {
    title: 'Subtle but chic',
    body: 'Understated design that still gets noticed. Exactly my style.',
  },

  {
    title: 'Well packaged',
    body: 'Arrived in perfect condition. The piece looked even better unboxed.',
  },

  {
    title: 'Confident buy',
    body: 'Sizing guide was helpful. Went with my usual size and it fits well.',
  },

  {
    title: 'Day-to-night ready',
    body: 'Threw on a jacket and it worked for an evening event too.',
  },

  { title: 'Soft touch', body: 'Fabric feels luxurious for the price point. No itchiness at all.' },

  {
    title: 'Modern silhouette',
    body: 'The shape feels current without being trendy. Should last seasons.',
  },

  {
    title: 'Happy shopper',
    body: 'Exactly what I needed to refresh my wardrobe. Quick dispatch too.',
  },

  {
    title: 'Reliable quality',
    body: 'Second item from Fashion Edge and both have been excellent.',
  },

  {
    title: 'Easy care',
    body: 'Washed gently and it held shape well. Low maintenance which I appreciate.',
  },

  {
    title: 'Great gift',
    body: 'Bought for my sister and she loved it. Might get one for myself now.',
  },

  {
    title: 'Polished look',
    body: 'Elevates a simple outfit instantly. The finish looks more expensive.',
  },

  { title: 'Comfort first', body: 'Can move freely without tugging. Ideal for long days out.' },

  { title: 'Colour pop', body: 'The shade is vibrant but not loud. Gets compliments every time.' },

  {
    title: 'Thoughtful design',
    body: 'Small details like the lining make a big difference. Well done.',
  },

  { title: 'True to size', body: 'Followed the chart and it fit perfectly on first try.' },

  { title: 'Weekend staple', body: 'Already in heavy rotation. Goes with half my wardrobe.' },

  { title: 'Light and airy', body: 'Perfect for warm afternoons. Does not cling uncomfortably.' },

  { title: 'Structured nicely', body: 'Holds its shape through the day without wrinkling much.' },

  { title: 'Elegant choice', body: 'Feels special without being over the top. Very pleased.' },

  { title: 'Smart buy', body: 'Quality exceeds what I expected at this price. Would recommend.' },

  { title: 'Fresh update', body: 'Added something new to my rotation without breaking the bank.' },

  { title: 'Lovely drape', body: 'Falls beautifully when walking. The movement is really nice.' },

  {
    title: 'Secure checkout',
    body: 'Smooth ordering experience and the item matched the description.',
  },

  { title: 'Minimal fuss', body: 'Easy to style with jewellery or keep plain. Works both ways.' },

  { title: 'Tailored feel', body: 'Looks more fitted than I expected in the best way.' },

  {
    title: 'Everyday luxury',
    body: 'Feels a step above high-street basics. Happy with the purchase.',
  },

  {
    title: 'Bright and fresh',
    body: 'The tone suits my skin well. Will pair with gold accessories.',
  },

  { title: 'Neat hems', body: 'Finishing is tidy all around. No loose threads anywhere.' },

  {
    title: 'Confident silhouette',
    body: 'Shoulders and waist sit right. Makes me feel put together.',
  },

  {
    title: 'Easy return to cart',
    body: 'Liked it so much I added another colour before the week ended.',
  },

  { title: 'Balanced fit', body: 'Not too boxy, not too tight. Goldilocks zone for me.' },
] as const;

function hashString(input: string): number {
  let h = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);

    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;

  return () => {
    t += 0x6d2b79f5;

    let r = Math.imul(t ^ (t >>> 15), 1 | t);

    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);

    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isFeaturedReviewProduct(name: string, slug?: string): boolean {
  const n = normalizeName(name);

  if (FEATURED_PRODUCT_NAMES.some((item) => normalizeName(item) === n)) return true;

  if (slug) {
    const s = slug.toLowerCase();

    return FEATURED_PRODUCT_NAMES.some((item) =>
      s.includes(normalizeName(item).replace(/\s+/g, '-')),
    );
  }

  return false;
}

function buildDistribution(
  total: number,

  targetAverage: number,

  rand: () => number,
): Record<number, number> {
  const weights = targetAverage >= 4.7 ? [0, 0, 0.06, 0.18, 0.76] : [0, 0, 0.1, 0.28, 0.62];

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;

  for (let i = 0; i < total; i += 1) {
    const roll = rand();

    let acc = 0;

    let rating = 5;

    for (let star = 1; star <= 5; star += 1) {
      acc += weights[star - 1] ?? 0;

      if (roll <= acc) {
        rating = star;

        break;
      }
    }

    distribution[rating] = (distribution[rating] ?? 0) + 1;
  }

  const avg = () => {
    let sum = 0;

    let count = 0;

    for (let star = 1; star <= 5; star += 1) {
      sum += star * (distribution[star] ?? 0);

      count += distribution[star] ?? 0;
    }

    return count ? sum / count : 0;
  };

  let guard = 0;

  while (avg() < targetAverage && guard < total) {
    if ((distribution[3] ?? 0) > 0) {
      distribution[3] = (distribution[3] ?? 0) - 1;

      distribution[5] = (distribution[5] ?? 0) + 1;
    } else if ((distribution[4] ?? 0) > 0) {
      distribution[4] = (distribution[4] ?? 0) - 1;

      distribution[5] = (distribution[5] ?? 0) + 1;
    } else {
      break;
    }

    guard += 1;
  }

  return distribution;
}

/** Pick a unique snippet per product + review index (no cross-product duplicates). */

function pickSnippet(productId: string, productName: string, index: number) {
  const start =
    hashString(`${productId}:${productName}`) % Math.max(1, REVIEW_SNIPPETS.length - 12);

  const snippetIndex = (start + index) % REVIEW_SNIPPETS.length;

  return REVIEW_SNIPPETS[snippetIndex]!;
}

export function getSeededReviewSummary(
  productId: string,

  productName: string,

  productSlug?: string,
): SeededReviewSummary {
  const featured = isFeaturedReviewProduct(productName, productSlug);

  const rand = mulberry32(hashString(`${productId}:${productSlug ?? productName}:summary`));

  const total = featured ? 100 + Math.floor(rand() * 101) : 30 + Math.floor(rand() * 71);

  const targetAverage = featured ? 4.75 + rand() * 0.2 : 4.25 + rand() * 0.45;

  const distribution = buildDistribution(total, targetAverage, rand);

  let sum = 0;

  for (let star = 1; star <= 5; star += 1) sum += star * (distribution[star] ?? 0);

  const average = Math.round((sum / total) * 10) / 10;

  const recommendRate = Math.round(
    (((distribution[4] ?? 0) + (distribution[5] ?? 0)) / total) * 100,
  );

  return { average, total, recommendRate, distribution };
}

export function getSeededReviews(
  productId: string,

  productName: string,

  productSlug?: string,

  limit = 12,
): SeededReview[] {
  const summary = getSeededReviewSummary(productId, productName, productSlug);

  const rand = mulberry32(hashString(`${productId}:reviews`));

  const ratingsPool: number[] = [];

  for (let star = 5; star >= 3; star -= 1) {
    const count = summary.distribution[star] ?? 0;

    for (let i = 0; i < count; i += 1) ratingsPool.push(star);
  }

  for (let i = ratingsPool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));

    [ratingsPool[i], ratingsPool[j]] = [ratingsPool[j]!, ratingsPool[i]!];
  }

  const now = Date.now();

  const reviewCount = Math.min(limit, ratingsPool.length, AUTHORS.length);

  return Array.from({ length: reviewCount }, (_, index) => {
    const snippet = pickSnippet(productId, productName, index);

    const author = AUTHORS[index % AUTHORS.length]!;

    const daysAgo = Math.floor(rand() * 120) + 1 + index * 3;

    return {
      id: `seed-${productId}-${index}`,

      rating: ratingsPool[index] ?? 5,

      title: snippet.title,

      body: snippet.body,

      author,

      createdAt: new Date(now - daysAgo * 86400000).toISOString(),

      isVerifiedPurchase: rand() > 0.15,
    };
  });
}
