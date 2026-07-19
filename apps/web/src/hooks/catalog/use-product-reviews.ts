import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { reviewsApi, type ReviewCreatePayload } from '@/services/sdk';
import { useAuthStore } from '@/store';

export function useProductReviews(productId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.products.reviews(productId ?? ''),
    queryFn: () => reviewsApi.listForProduct(productId!),
    enabled: Boolean(productId),
    staleTime: 1000 * 60,
  });
}

export function useReviewEligibility(productId?: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: QUERY_KEYS.products.reviewEligibility(productId ?? ''),
    queryFn: () => reviewsApi.eligibility(productId!),
    enabled: Boolean(productId && accessToken),
    staleTime: 1000 * 30,
    retry: false,
  });
}

export function useCreateReviewMutation(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReviewCreatePayload) => reviewsApi.create(productId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products.reviews(productId),
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products.reviewEligibility(productId),
      });
    },
  });
}
