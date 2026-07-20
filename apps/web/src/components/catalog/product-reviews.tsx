import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Star, ThumbsUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateReviewMutation, useProductReviews, useReviewEligibility } from '@/hooks/catalog';
import { reviewsApi, type ReviewImage } from '@/services/sdk';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { AppError } from '@/lib/errors';

function Stars({
  value,
  size = 'sm',
  interactive = false,
  onChange,
}: {
  value: number;
  size?: 'sm' | 'lg';
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  const iconClass = size === 'lg' ? 'size-6' : 'size-4';
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={!interactive}
          aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
          onClick={() => onChange?.(rating)}
          className={cn(!interactive && 'pointer-events-none')}
        >
          <Star
            className={cn(
              iconClass,
              rating <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBars({
  distribution,
  total,
}: {
  distribution: Record<number, number>;
  total: number;
}) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((rating) => {
        const count = distribution[rating] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={rating} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-8">{rating}</span>
            <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  'h-full rounded-full',
                  rating >= 4
                    ? 'bg-emerald-500'
                    : rating === 3
                      ? 'bg-amber-400'
                      : 'bg-muted-foreground/40',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground w-12 text-right tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProductReviewsSection({ productId }: { productId: string }) {
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const reviewsQuery = useProductReviews(productId);
  const eligibilityQuery = useReviewEligibility(productId);
  const createMutation = useCreateReviewMutation(productId);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const summary = reviewsQuery.data?.summary;
  const items = reviewsQuery.data?.items ?? [];
  const eligibility = eligibilityQuery.data;

  const emptySummary = useMemo(
    () => ({
      average: 0,
      total: 0,
      recommendRate: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      customerImages: [] as ReviewImage[],
    }),
    [],
  );

  const stats = summary ?? emptySummary;

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded = await reviewsApi.uploadImages(productId, Array.from(files).slice(0, 6));
      setImages((prev) => [...prev, ...uploaded].slice(0, 6));
    } catch (error) {
      toast.error(AppError.isAppError(error) ? error.message : 'Unable to upload images');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eligibility?.eligible || !eligibility.orderId) return;
    try {
      await createMutation.mutateAsync({
        orderId: eligibility.orderId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
        images,
      });
      setTitle('');
      setBody('');
      setImages([]);
      setRating(5);
      toast.success('Review submitted — it will appear after admin approval.');
    } catch (error) {
      toast.error(AppError.isAppError(error) ? error.message : 'Unable to submit review');
    }
  };

  return (
    <section aria-labelledby="product-reviews" className="mt-16 space-y-8 border-t pt-12">
      <Tabs defaultValue="product">
        <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="product"
            className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-4 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Product Reviews
          </TabsTrigger>
          <TabsTrigger
            value="brand"
            className="data-[state=active]:border-foreground rounded-none border-b-2 border-transparent px-4 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Brand Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="mt-8 space-y-8">
          {stats.total > 0 ? (
            <p className="text-foreground flex items-center gap-2 text-sm font-medium">
              <ThumbsUp className="size-4 text-emerald-600" />
              {stats.recommendRate}% of verified buyers recommend this product
            </p>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <div className="flex items-end gap-3">
                <p className="font-display text-5xl font-bold leading-none">
                  {stats.average || '—'}
                </p>
                <div className="pb-1">
                  <Stars value={Math.round(stats.average)} size="lg" />
                  <p className="text-muted-foreground mt-1 text-sm">
                    {stats.total} rating{stats.total === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <RatingBars distribution={stats.distribution} total={stats.total} />
              {isAuthed && eligibility?.eligible ? (
                <Button variant="outline" size="sm" className="rounded-full uppercase">
                  Rate
                </Button>
              ) : null}
            </div>

            <div className="space-y-4">
              {stats.customerImages.length ? (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Customer Images ({stats.customerImages.length})
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {stats.customerImages.slice(0, 12).map((image, index) => (
                      <img
                        key={`${image.url}-${index}`}
                        src={image.thumbnailUrl ?? image.url}
                        alt={image.alt ?? 'Customer review image'}
                        className="size-20 shrink-0 rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {!isAuthed ? (
                <div className="bg-muted/40 rounded-2xl border p-5 text-sm">
                  <p className="text-foreground font-medium">Sign in to write a review</p>
                  <p className="text-muted-foreground mt-1">
                    Only customers with a delivered order for this product can review it.
                  </p>
                  <Button asChild className="mt-4" variant="outline" size="sm">
                    <Link to="/auth/login">Sign in</Link>
                  </Button>
                </div>
              ) : eligibility?.eligible ? (
                <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border p-5">
                  <div>
                    <Label>Your rating</Label>
                    <div className="mt-2">
                      <Stars value={rating} size="lg" interactive onChange={setRating} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-title">Title (optional)</Label>
                    <Input
                      id="review-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={160}
                      placeholder="Sum up your experience"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-body">Review</Label>
                    <Textarea
                      id="review-body"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      required
                      minLength={10}
                      rows={4}
                      placeholder="Share fit, quality, and photos from your order"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-images">Photos</Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="review-images"
                        className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      >
                        <Upload className="size-4" />
                        {uploading ? 'Uploading…' : 'Upload images'}
                      </label>
                      <input
                        id="review-images"
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={uploading}
                        onChange={(event) => void onUpload(event.target.files)}
                      />
                      <span className="text-muted-foreground text-xs">Up to 6 images</span>
                    </div>
                    {images.length ? (
                      <div className="flex gap-2 pt-1">
                        {images.map((image) => (
                          <img
                            key={image.url}
                            src={image.thumbnailUrl ?? image.url}
                            alt=""
                            className="size-14 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || body.trim().length < 10}
                  >
                    {createMutation.isPending ? 'Submitting…' : 'Submit review'}
                  </Button>
                </form>
              ) : (
                <div className="bg-muted/40 rounded-2xl border p-5 text-sm">
                  <p className="text-foreground font-medium">Reviews unlock after delivery</p>
                  <p className="text-muted-foreground mt-1">
                    {eligibility?.reason ??
                      'Once your order is marked delivered, you can rate this product.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No approved reviews yet.</p>
            ) : (
              items.map((review) => (
                <article key={review.id} className="border-border/70 rounded-2xl border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars value={review.rating} />
                    {review.isVerifiedPurchase ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        Verified purchase
                      </span>
                    ) : null}
                  </div>
                  {review.title ? <h3 className="mt-2 font-semibold">{review.title}</h3> : null}
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {review.body}
                  </p>
                  {review.images.length ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {review.images.map((image) => (
                        <img
                          key={image.url}
                          src={image.thumbnailUrl ?? image.url}
                          alt={image.alt ?? ''}
                          className="size-16 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-8">
          <p className="text-muted-foreground text-sm">
            Brand reviews are aggregated across all products from this brand. Coming soon.
          </p>
        </TabsContent>
      </Tabs>
    </section>
  );
}
