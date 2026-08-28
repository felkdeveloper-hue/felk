import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store';
import { ordersApi } from '@/services/sdk';
import { QUERY_KEYS, ROUTES } from '@/constants';

const STORAGE_KEY = 'fe.review-prompts.v1';

type PromptedMap = Record<string, true>;

function readPrompted(): PromptedMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PromptedMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function markPrompted(key: string) {
  const next = { ...readPrompted(), [key]: true as const };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

type PendingReview = {
  key: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
};

/**
 * Shows a one-time review request after delivery.
 * Persists dismiss/skip so the same order/product is never spammed again.
 */
export function ReviewRequestPrompt() {
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const ordersQuery = useQuery({
    queryKey: QUERY_KEYS.orders.list({ page: 1, limit: 10 }),
    queryFn: () => ordersApi.list({ page: 1, limit: 10 }),
    enabled: isAuthed,
    staleTime: 1000 * 60,
  });
  const [pending, setPending] = useState<PendingReview | null>(null);
  const [open, setOpen] = useState(false);

  const candidates = useMemo(() => {
    if (!isAuthed || !ordersQuery.data?.data?.length) return [] as PendingReview[];
    const prompted = readPrompted();
    const list: PendingReview[] = [];
    for (const order of ordersQuery.data.data) {
      if (!['delivered', 'completed'].includes(String(order.status))) continue;
      for (const item of order.items ?? []) {
        const productId = String(item.productId ?? '');
        if (!productId) continue;
        const key = `${order.id}:${productId}`;
        if (prompted[key]) continue;
        list.push({
          key,
          orderId: order.id,
          orderNumber: order.orderNumber,
          productId,
          productName: item.name || 'your recent purchase',
        });
      }
    }
    return list;
  }, [isAuthed, ordersQuery.data?.data]);

  useEffect(() => {
    if (!isAuthed || !candidates.length || pending) return;
    const next = candidates[0]!;
    setPending(next);
    const timer = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(timer);
  }, [candidates, isAuthed, pending]);

  const dismiss = (persist: boolean) => {
    if (pending && persist) markPrompted(pending.key);
    setOpen(false);
    setPending(null);
  };

  if (!isAuthed || !pending) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss(true);
      }}
    >
      <DialogContent className="max-w-md rounded-none border-neutral-200 sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            How was your order?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Order {pending.orderNumber} was delivered. Share a quick review for{' '}
            <span className="text-foreground font-medium">{pending.productName}</span> — it helps
            other shoppers (and only takes a minute).
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <StarRating value={5} size="lg" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="rounded-none"
            onClick={() => dismiss(true)}
          >
            Skip for now
          </Button>
          <Button asChild className="rounded-none" onClick={() => dismiss(true)}>
            <Link to="/products/$slug" params={{ slug: pending.productId }} hash="product-reviews">
              Write a review
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-[11px]">
          We only ask once per delivered item. You can always review from your{' '}
          <Link to={ROUTES.accountOrders} className="underline underline-offset-2">
            orders
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
