import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ThumbsUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/ui/star-rating';
import { useCreateReviewMutation, useProductReviews, useReviewEligibility } from '@/hooks/catalog';
import { getSeededReviews, getSeededReviewSummary } from '@/lib/seeded-reviews';
import { reviewsApi, type ReviewImage, type ProductReview } from '@/services/sdk';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { AppError } from '@/lib/errors';

const INITIAL_VISIBLE = 2;

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
            <span className="text-muted-foreground w-4 tabular-nums">{rating}</span>
            <div className="h-1.5 flex-1 overflow-hidden bg-neutral-200">
              <div className="h-full bg-neutral-900" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProductReviewsSection({
  productId,
  productName,
  productSlug,
}: {
  productId: string;
  productName: string;
  productSlug?: string;
}) {
  const isAuthed = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const reviewsQuery = useProductReviews(productId);
  const eligibilityQuery = useReviewEligibility(productId);
  const createMutation = useCreateReviewMutation(productId);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<ReviewImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const seededSummary = useMemo(
    () => getSeededReviewSummary(productId, productName, productSlug),
    [productId, productName, productSlug],
  );
  const seededItems = useMemo(
    () => getSeededReviews(productId, productName, productSlug, 10),
    [productId, productName, productSlug],
  );

  const apiSummary = reviewsQuery.data?.summary;
  const apiItems = reviewsQuery.data?.items ?? [];
  const eligibility = eligibilityQuery.data;
  const useSeeded = !apiSummary || apiSummary.total < 5;

  const stats = useSeeded
    ? {
        ...seededSummary,
        customerImages: [] as ReviewImage[],
      }
    : apiSummary;

  const items: Array<ProductReview & { author?: string }> = useSeeded
    ? seededItems.map((item) => ({
        id: item.id,
        productId,
        customerId: 'seed',
        orderId: 'seed',
        rating: item.rating,
        title: item.title,
        body: item.body,
        images: [],
        status: 'approved',
        isVerifiedPurchase: item.isVerifiedPurchase,
        createdAt: item.createdAt,
        author: item.author,
      }))
    : apiItems;

  const visibleItems = items.slice(0, visibleCount);
  const hasMoreReviews = items.length > visibleCount;

  const brandStats = useMemo(
    () => getSeededReviewSummary('brand-fashion-edge', 'Fashion Edge', 'fashion-edge'),
    [],
  );
  const brandItems = useMemo(
    () => getSeededReviews('brand-fashion-edge', 'Fashion Edge', 'fashion-edge', 6),
    [],
  );

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
    <section
      id="product-reviews"
      aria-labelledby="product-reviews-heading"
      className="mt-16 space-y-8 border-t pt-12"
    >
      <h2 id="product-reviews-heading" className="sr-only">
        Product reviews
      </h2>
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
              <ThumbsUp className="size-4" />
              {stats.recommendRate}% of verified buyers recommend this product
            </p>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-5">
              <div className="flex items-end gap-3">
                <p className="font-display text-5xl font-bold leading-none tracking-tight">
                  {stats.average.toFixed(1)}
                </p>
                <div className="pb-1">
                  <StarRating value={stats.average} size="lg" />
                  <p className="text-muted-foreground mt-1 text-sm">
                    {stats.total} rating{stats.total === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <RatingBars distribution={stats.distribution} total={stats.total} />
            </div>

            <div className="space-y-4">
              <div className="rounded-none border border-neutral-200 bg-neutral-50/80 p-5 text-sm">
                <p className="text-foreground font-semibold tracking-wide">
                  Customer photo reviews coming soon
                </p>
                <p className="text-muted-foreground mt-1.5 leading-relaxed">
                  We&apos;re preparing a curated gallery of verified customer photos. Written
                  reviews remain available below.
                </p>
              </div>

              {!isAuthed ? (
                <div className="rounded-none border p-5 text-sm">
                  <p className="text-foreground font-medium">Sign in to write a review</p>
                  <p className="text-muted-foreground mt-1">
                    Only customers with a delivered order for this product can review it.
                  </p>
                  <Button asChild className="mt-4 rounded-none" variant="outline" size="sm">
                    <Link to="/auth/login">Sign in</Link>
                  </Button>
                </div>
              ) : eligibility?.eligible ? (
                <form onSubmit={onSubmit} className="space-y-4 rounded-none border p-5">
                  <div>
                    <Label>Your rating</Label>
                    <div className="mt-2">
                      <StarRating value={rating} size="lg" interactive onChange={setRating} />
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
                      className="rounded-none"
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
                      placeholder="Share fit, quality, and how you styled it"
                      className="rounded-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review-images">Photos</Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="review-images"
                        className="border-border hover:bg-muted inline-flex cursor-pointer items-center gap-2 border px-3 py-2 text-sm"
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
                            className="size-14 object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    className="rounded-none"
                    disabled={createMutation.isPending || body.trim().length < 10}
                  >
                    {createMutation.isPending ? 'Submitting…' : 'Submit review'}
                  </Button>
                </form>
              ) : (
                <div className="rounded-none border border-neutral-200 bg-neutral-50/60 p-5 text-sm">
                  <p className="text-foreground font-medium">Reviews unlock after delivery</p>
                  <p className="text-muted-foreground mt-1">
                    {eligibility?.reason ??
                      'You can review this product after your order is delivered.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {visibleItems.map((review) => (
              <article key={review.id} className="border-border/70 border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StarRating value={review.rating} />
                    {'author' in review && review.author ? (
                      <span className="text-muted-foreground text-xs font-medium">
                        {String(review.author)}
                      </span>
                    ) : null}
                  </div>
                  {review.isVerifiedPurchase ? (
                    <span className="bg-neutral-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Verified purchase
                    </span>
                  ) : null}
                </div>
                {review.title ? <h3 className="mt-2 font-semibold">{review.title}</h3> : null}
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{review.body}</p>
              </article>
            ))}
            {hasMoreReviews ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-8 text-xs font-semibold uppercase tracking-[0.14em]"
                  onClick={() => setVisibleCount(items.length)}
                >
                  Show more reviews
                </Button>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="brand" className="mt-8 space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-5">
              <div className="flex items-end gap-3">
                <p className="font-display text-5xl font-bold leading-none">
                  {brandStats.average.toFixed(1)}
                </p>
                <div className="pb-1">
                  <StarRating value={brandStats.average} size="lg" />
                  <p className="text-muted-foreground mt-1 text-sm">
                    {brandStats.total} brand ratings
                  </p>
                </div>
              </div>
              <RatingBars distribution={brandStats.distribution} total={brandStats.total} />
            </div>
            <div className="rounded-none border border-neutral-200 bg-neutral-50/80 p-5 text-sm">
              <p className="font-semibold">Fashion Edge shoppers</p>
              <p className="text-muted-foreground mt-1.5 leading-relaxed">
                Brand reviews reflect experiences across the Fashion Edge collection — fit, quality,
                and service from fe.lk.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {brandItems.map((review) => (
              <article key={review.id} className="border-border/70 border p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StarRating value={review.rating} />
                    <span className="text-muted-foreground text-xs font-medium">
                      {review.author}
                    </span>
                  </div>
                  {review.isVerifiedPurchase ? (
                    <span className="bg-neutral-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Verified purchase
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-semibold">{review.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{review.body}</p>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
