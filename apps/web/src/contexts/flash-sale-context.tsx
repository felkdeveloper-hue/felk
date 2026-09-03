import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/query-keys';
import { customersApi } from '@/services/sdk';
import { storefrontApi } from '@/services/sdk/storefront';
import { useAuthStore } from '@/store/auth-store';

const FLASH_SALE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface FlashSaleContextValue {
  /** Whether the flash sale is currently active for this user */
  isFlashSaleActive: boolean;
  /** Milliseconds remaining in the flash sale (0 if not active) */
  timeRemaining: number;
  /** Formatted string like "59:42" */
  formattedTime: string;
  /**
   * Always-on perpetual 1-hour countdown synced to the UTC hour boundary.
   * All users see the same timer (epoch-aligned). Does not require auth.
   */
  alwaysOnFormattedTime: string;
  /** Raw ms remaining for the always-on epoch-aligned countdown. */
  alwaysOnTimeRemaining: number;
  /** Whether the popup should be shown to the user right now */
  showPopup: boolean;
  /** Call this to dismiss the popup */
  dismissPopup: () => void;
  /**
   * Universal popup — shown to ALL visitors (logged-in, guests) on every page
   * load after a 1.5 s delay. Not gated by session/localStorage.
   */
  showUniversalPopup: boolean;
  /** Dismiss the universal popup for this page view. */
  dismissUniversalPopup: () => void;
  /** Whether flash sale data is loading */
  isLoading: boolean;
}

/** Returns ms until the next UTC hour boundary (epoch-aligned 1-hour cycle). */
function getAlwaysOnMs(): number {
  const nowSecs = Math.floor(Date.now() / 1000);
  return (3600 - (nowSecs % 3600)) * 1000;
}

const FlashSaleContext = createContext<FlashSaleContextValue>({
  isFlashSaleActive: false,
  timeRemaining: 0,
  formattedTime: '00:00',
  alwaysOnFormattedTime: '00:00',
  alwaysOnTimeRemaining: 0,
  showPopup: false,
  dismissPopup: () => {},
  showUniversalPopup: false,
  dismissUniversalPopup: () => {},
  isLoading: false,
});

export function useFlashSale() {
  return useContext(FlashSaleContext);
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const POPUP_DISMISSED_KEY = 'flash_sale_popup_dismissed';

interface FlashSaleProviderProps {
  children: ReactNode;
}

export function FlashSaleProvider({ children }: FlashSaleProviderProps) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken && state.user));
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [showUniversalPopup, setShowUniversalPopup] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Universal popup — fires for ALL visitors on every page load, no storage gate.
  useEffect(() => {
    const timer = setTimeout(() => setShowUniversalPopup(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Always-on epoch-aligned 1-hour countdown (no auth required)
  const [alwaysOnRemaining, setAlwaysOnRemaining] = useState(() => getAlwaysOnMs());
  const alwaysOnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const tick = () => setAlwaysOnRemaining(getAlwaysOnMs());
    tick();
    alwaysOnIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (alwaysOnIntervalRef.current) clearInterval(alwaysOnIntervalRef.current);
    };
  }, []);

  // Authenticated: fetch member flash sale from server
  const { data: flashSaleData, isLoading: isLoadingAuthed } = useQuery({
    queryKey: QUERY_KEYS.customers.flashSale(),
    queryFn: () => customersApi.getFlashSale(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  // Anonymous: IP-persisted flash sale for unsigned visitors
  const { data: anonymousFlashSaleData, isLoading: isLoadingAnonymous } = useQuery({
    queryKey: QUERY_KEYS.storefront.flashSale(),
    queryFn: () => storefrontApi.getFlashSale(),
    enabled: !isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const activeFlashSaleData = isAuthenticated ? flashSaleData : anonymousFlashSaleData;
  const isLoading = isAuthenticated ? isLoadingAuthed : isLoadingAnonymous;

  // Mutation to start the flash sale (authenticated only — transfers IP timer on login)
  const startFlashSaleMutation = useMutation({
    mutationFn: () => customersApi.startFlashSale(),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.flashSale() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storefront.flashSale() });
      if (!data.alreadyStarted) {
        const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
        if (!dismissed) {
          setShowPopup(true);
        }
      }
    },
  });

  // Refetch anonymous flash sale immediately after logout
  const wasAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storefront.flashSale() });
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);

  // Start or transfer flash sale when user logs in
  useEffect(() => {
    if (!isAuthenticated || isLoadingAuthed) return;
    if (flashSaleData === undefined) return;

    const shouldStartFresh =
      !flashSaleData.flashSaleStartTime || flashSaleData.apologyFlashSalePending === true;

    if (shouldStartFresh) {
      startFlashSaleMutation.mutate();
    } else if (flashSaleData.isActive) {
      const dismissed = sessionStorage.getItem(POPUP_DISMISSED_KEY);
      if (!dismissed) {
        setShowPopup(true);
        sessionStorage.setItem(POPUP_DISMISSED_KEY, '1');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoadingAuthed, flashSaleData?.flashSaleStartTime, user?.id]);

  // Real-time countdown (works for both authenticated and anonymous)
  useEffect(() => {
    const startTimeStr = activeFlashSaleData?.flashSaleStartTime ?? null;
    if (!startTimeStr || !activeFlashSaleData?.isActive) {
      startTimeRef.current = null;
      setTimeRemaining(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const startTs = new Date(startTimeStr).getTime();
    startTimeRef.current = startTs;

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startTs;
      const remaining = Math.max(0, FLASH_SALE_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (isAuthenticated) {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.flashSale() });
        } else {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storefront.flashSale() });
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    activeFlashSaleData?.flashSaleStartTime,
    activeFlashSaleData?.isActive,
    isAuthenticated,
    queryClient,
  ]);

  const isFlashSaleActive = (activeFlashSaleData?.isActive ?? false) && timeRemaining > 0;

  const dismissPopup = () => {
    setShowPopup(false);
    sessionStorage.setItem(POPUP_DISMISSED_KEY, '1');
  };

  const dismissUniversalPopup = () => setShowUniversalPopup(false);

  return (
    <FlashSaleContext.Provider
      value={{
        isFlashSaleActive,
        timeRemaining,
        formattedTime: formatTime(timeRemaining),
        alwaysOnFormattedTime: formatTime(alwaysOnRemaining),
        alwaysOnTimeRemaining: alwaysOnRemaining,
        showPopup: showPopup && isFlashSaleActive,
        dismissPopup,
        showUniversalPopup,
        dismissUniversalPopup,
        isLoading,
      }}
    >
      {children}
    </FlashSaleContext.Provider>
  );
}
