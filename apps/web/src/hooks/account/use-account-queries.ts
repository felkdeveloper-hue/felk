import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import {
  customersApi,
  type CustomerAddress,
  type CustomerAddressInput,
  type CustomerPreferences,
  type CustomerProfile,
} from '@/services/sdk';

export function useCustomerProfileQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.customers.me(),
    queryFn: () => customersApi.getMe(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CustomerProfile>) => customersApi.updateMe(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.customers.me(), data);
    },
  });
}

export function useCustomerPreferencesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.customers.preferences(),
    queryFn: () => customersApi.getPreferences(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdatePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerPreferences) => customersApi.updatePreferences(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.customers.preferences(), data);
    },
  });
}

export function useAddressesQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.customers.addresses(),
    queryFn: () => customersApi.listAddresses(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerAddressInput) => customersApi.createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.addresses() });
    },
  });
}

export function useUpdateAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      addressId,
      payload,
    }: {
      addressId: string;
      payload: Partial<CustomerAddressInput>;
    }) => customersApi.updateAddress(addressId, payload),
    onMutate: async ({ addressId, payload }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.customers.addresses() });
      const previous = queryClient.getQueryData<CustomerAddress[]>(
        QUERY_KEYS.customers.addresses(),
      );
      if (previous) {
        queryClient.setQueryData(
          QUERY_KEYS.customers.addresses(),
          previous.map((address) =>
            address.id === addressId ? { ...address, ...payload } : address,
          ),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.customers.addresses(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.addresses() });
    },
  });
}

export function useDeleteAddressMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => customersApi.removeAddress(addressId),
    onMutate: async (addressId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.customers.addresses() });
      const previous = queryClient.getQueryData<CustomerAddress[]>(
        QUERY_KEYS.customers.addresses(),
      );
      if (previous) {
        queryClient.setQueryData(
          QUERY_KEYS.customers.addresses(),
          previous.filter((address) => address.id !== addressId),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.customers.addresses(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.addresses() });
    },
  });
}

export function useWishlistCountQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.customers.wishlists(),
    queryFn: () => customersApi.listWishlists(),
    staleTime: 1000 * 60 * 5,
    select: (wishlists) => wishlists.length,
  });
}

export function computeProfileCompletion(profile?: CustomerProfile | null): number {
  if (!profile) return 0;
  const fields = [
    profile.firstName,
    profile.lastName,
    profile.phone,
    profile.profilePhotoUrl,
    profile.dateOfBirth,
    profile.gender,
  ];
  const filled = fields.filter((value) => Boolean(value)).length;
  return Math.round((filled / fields.length) * 100);
}
