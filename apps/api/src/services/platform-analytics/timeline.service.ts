import { Types } from 'mongoose';
import { EventModel, PageViewModel, SessionModel } from '@/models/analytics/index.js';
import { CustomerModel } from '@/models/customer.models.js';

export interface TimelineItem {
  id: string;
  at: string;
  type: 'page' | 'event';
  name: string;
  label: string;
  sessionId?: string | null;
  path?: string | null;
  properties?: Record<string, unknown>;
  deltaMs?: number | null;
  scrollDepth?: number | null;
  timeOnPageMs?: number | null;
}

function humanizeEvent(name: string, properties?: Record<string, unknown> | null): string {
  const product = (properties?.productName as string) || null;
  switch (name) {
    case 'product_viewed':
    case 'product_detail_opened':
      return product ? `Viewed ${product}` : 'Viewed a product';
    case 'product_card_clicked':
      return product ? `Clicked ${product}` : 'Clicked a product card';
    case 'product_image_clicked':
      return product ? `Clicked image of ${product}` : 'Clicked product image';
    case 'product_quick_view':
      return product ? `Quick viewed ${product}` : 'Opened quick view';
    case 'add_to_wishlist':
      return product ? `Added ${product} to Wishlist` : 'Added to wishlist';
    case 'remove_from_wishlist':
      return product ? `Removed ${product} from Wishlist` : 'Removed from wishlist';
    case 'add_to_cart':
      return product ? `Added ${product} to Cart` : 'Added to cart';
    case 'remove_from_cart':
      return product ? `Removed ${product} from Cart` : 'Removed from cart';
    case 'quantity_increased':
      return product ? `Increased quantity of ${product}` : 'Increased quantity';
    case 'quantity_decreased':
      return product ? `Decreased quantity of ${product}` : 'Decreased quantity';
    case 'buy_now_clicked':
      return product ? `Buy Now — ${product}` : 'Buy Now clicked';
    case 'checkout_started':
      return 'Started Checkout';
    case 'checkout_shipping_reached':
      return 'Reached Shipping';
    case 'checkout_review_reached':
      return 'Reached Review';
    case 'checkout_abandoned':
      return 'Abandoned Checkout';
    case 'payment_page_reached':
      return 'Reached Payment Page';
    case 'payment_failed':
      return 'Payment Failed';
    case 'payment_completed':
      return 'Completed Payment';
    case 'returned_to_cart':
      return 'Returned To Cart';
    case 'order_delivered':
      return 'Order Delivered';
    case 'search':
      return properties?.query ? `Searched “${properties.query}”` : 'Searched';
    case 'search_zero_results':
      return properties?.query ? `No results for “${properties.query}”` : 'Search with no results';
    case 'search_suggestion_clicked':
      return properties?.query
        ? `Clicked suggestion “${properties.query}”`
        : 'Clicked search suggestion';
    case 'search_result_clicked':
      return product ? `Clicked search result ${product}` : 'Clicked search result';
    case 'login':
      return 'Logged In';
    case 'logout':
      return 'Logged Out';
    case 'signup':
      return 'Signed Up';
    case 'session_start':
      return 'Session Started';
    case 'order_updated':
      return 'Order Updated';
    default:
      return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function humanizePath(path: string | null | undefined, title?: string | null): string {
  if (title && title.trim()) return `Visited ${title}`;
  if (!path) return 'Visited a page';
  if (path === '/' || path === '') return 'Visited Home';
  if (path.startsWith('/collections/') || path.startsWith('/shop/')) {
    const slug = path.split('/').filter(Boolean).pop() ?? path;
    return `Opened ${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Collection`;
  }
  if (path.startsWith('/products/')) {
    const slug = path.split('/').filter(Boolean).pop() ?? 'product';
    return `Viewed ${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  if (path.startsWith('/cart')) return 'Visited Cart';
  if (path.startsWith('/checkout')) return 'Visited Checkout';
  if (path.startsWith('/search')) return 'Visited Search';
  return `Visited ${path}`;
}

function withDeltas(items: TimelineItem[]): TimelineItem[] {
  let prev: number | null = null;
  return items.map((item) => {
    const t = new Date(item.at).getTime();
    const deltaMs = prev == null ? 0 : Math.max(0, t - prev);
    prev = t;
    return { ...item, deltaMs };
  });
}

export async function getCustomerTimeline(userId: string, limit = 200): Promise<TimelineItem[]> {
  if (!Types.ObjectId.isValid(userId)) return [];

  let oid = new Types.ObjectId(userId);
  const asCustomer = await CustomerModel.findById(userId).select('userId').lean();
  if (asCustomer?.userId) {
    oid = asCustomer.userId as Types.ObjectId;
  }

  const [events, pageViews] = await Promise.all([
    EventModel.find({ userId: oid }).sort({ occurredAt: -1 }).limit(limit).lean(),
    PageViewModel.find({ userId: oid }).sort({ viewedAt: -1 }).limit(limit).lean(),
  ]);

  const items: TimelineItem[] = [
    ...events.map((e) => ({
      id: e.eventId,
      at: e.occurredAt.toISOString(),
      type: 'event' as const,
      name: e.name,
      label: humanizeEvent(e.name, e.properties),
      sessionId: e.sessionId,
      path: e.path,
      properties: e.properties ?? {},
    })),
    ...pageViews.map((p) => ({
      id: String(p._id),
      at: p.viewedAt.toISOString(),
      type: 'page' as const,
      name: 'page_view',
      label: humanizePath(p.path, p.title),
      sessionId: p.sessionId,
      path: p.path,
      properties: { scrollDepth: p.scrollDepth, timeOnPageMs: p.timeOnPageMs },
      scrollDepth: p.scrollDepth ?? null,
      timeOnPageMs: p.timeOnPageMs ?? null,
    })),
  ];

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, limit);
}

export async function getSessionReplay(sessionId: string): Promise<{
  session: Record<string, unknown> | null;
  summary: {
    durationMs: number | null;
    activeMs: number | null;
    pageCount: number;
    clickCount: number;
    maxScrollDepth: number;
    deviceType: string | null;
    browser: string | null;
  } | null;
  steps: TimelineItem[];
}> {
  const [session, events, pageViews] = await Promise.all([
    SessionModel.findOne({ sessionId }).lean(),
    EventModel.find({ sessionId }).sort({ occurredAt: 1 }).lean(),
    PageViewModel.find({ sessionId }).sort({ viewedAt: 1 }).lean(),
  ]);

  const rawSteps: TimelineItem[] = [
    ...events.map((e) => ({
      id: e.eventId,
      at: e.occurredAt.toISOString(),
      type: 'event' as const,
      name: e.name,
      label: humanizeEvent(e.name, e.properties),
      sessionId: e.sessionId,
      path: e.path,
      properties: e.properties ?? {},
    })),
    ...pageViews.map((p) => ({
      id: String(p._id),
      at: p.viewedAt.toISOString(),
      type: 'page' as const,
      name: 'page_view',
      label:
        p.scrollDepth && p.scrollDepth >= 50
          ? `${humanizePath(p.path, p.title)} · Scrolled ${p.scrollDepth}%`
          : humanizePath(p.path, p.title),
      sessionId: p.sessionId,
      path: p.path,
      properties: { scrollDepth: p.scrollDepth, timeOnPageMs: p.timeOnPageMs },
      scrollDepth: p.scrollDepth ?? null,
      timeOnPageMs: p.timeOnPageMs ?? null,
    })),
  ];

  rawSteps.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const steps = withDeltas(rawSteps);

  return {
    session: session as Record<string, unknown> | null,
    summary: session
      ? {
          durationMs: session.durationMs ?? null,
          activeMs: session.activeMs ?? null,
          pageCount: session.pageCount ?? 0,
          clickCount: session.clickCount ?? 0,
          maxScrollDepth: session.maxScrollDepth ?? 0,
          deviceType: session.deviceType ?? null,
          browser: session.browser ?? null,
        }
      : null,
    steps,
  };
}
