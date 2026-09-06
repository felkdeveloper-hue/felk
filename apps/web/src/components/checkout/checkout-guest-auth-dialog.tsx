import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordField } from '@/components/forms/password-field';
import { AuthErrorAlert } from '@/components/auth/auth-error-alert';
import { AddressForm } from '@/components/account/address-form';
import { authApi, customersApi, type CustomerAddressInput } from '@/services/sdk';
import { useAuthStore, useCartStore, useCheckoutStore } from '@/store';
import { useCreateAddressMutation } from '@/hooks/account';
import { cartApi } from '@/services/sdk/cart';
import { QUERY_KEYS } from '@/constants/query-keys';
import { AppError } from '@/lib/errors';
import { getAttributionPayloadForAuth } from '@/lib/analytics/auth-attribution';
import { useFlashSale } from '@/contexts/flash-sale-context';
import { Zap } from 'lucide-react';

type Step = 'email' | 'password' | 'otp' | 'create_password' | 'address';

const RESEND_COOLDOWN_SEC = 30;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export interface CheckoutGuestAuthDialogProps {
  open: boolean;
  onAuthenticated: () => void;
}

function FlashSaleCheckoutPromo() {
  const { isFlashSaleActive, formattedTime } = useFlashSale();

  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-4 text-white"
      style={{
        background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 42%, #f97316 100%)',
        boxShadow: '0 10px 28px rgba(234, 88, 12, 0.35)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-white/15"
      />
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-50">
        <Zap className="size-3.5 fill-current" />
        Sitewide flash sale
      </p>
      <p className="mt-1.5 font-display text-3xl font-bold leading-none tracking-tight">20% OFF</p>
      <p className="mt-1.5 text-sm font-medium text-orange-50">
        Time-limited deal on the whole website — no code needed.
      </p>
      {isFlashSaleActive ? (
        <p className="mt-3 inline-flex items-center rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold tracking-wide">
          Ends in {formattedTime}
        </p>
      ) : (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-orange-50/90">
          Limited-time offer
        </p>
      )}
    </div>
  );
}

export function CheckoutGuestAuthDialog({ open, onAuthenticated }: CheckoutGuestAuthDialogProps) {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const setShippingAddressId = useCheckoutStore((s) => s.setSelectedShippingAddressId);
  const setBillingAddressId = useCheckoutStore((s) => s.setSelectedBillingAddressId);
  const createAddress = useCreateAddressMutation();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [guestPending, setGuestPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (step !== 'otp') return;
    const id = window.setInterval(() => {
      setResendIn((seconds) => (seconds <= 0 ? 0 : seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const persistFlashSale = async () => {
    try {
      const status = await customersApi.startFlashSale();
      queryClient.setQueryData(QUERY_KEYS.customers.flashSale(), status);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.flashSale() });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storefront.flashSale() });
    } catch {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers.flashSale() });
    }
  };

  const afterAuth = async () => {
    await persistFlashSale();
    const guestCartToken = useCartStore.getState().guestCartToken;
    if (guestCartToken) {
      try {
        const merged = await cartApi.merge(guestCartToken);
        useCartStore.getState().setCart(merged);
        useCartStore.getState().setGuestCartToken(null);
        queryClient.setQueryData(QUERY_KEYS.cart.current(), merged);
      } catch {
        try {
          const cart = await cartApi.get();
          useCartStore.getState().setCart(cart);
          queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
        } catch {
          /* keep local cart snapshot */
        }
      }
    } else {
      try {
        const cart = await cartApi.get();
        useCartStore.getState().setCart(cart);
        queryClient.setQueryData(QUERY_KEYS.cart.current(), cart);
      } catch {
        /* keep local cart snapshot */
      }
    }

    const addresses = await customersApi.listAddresses().catch(() => []);
    queryClient.setQueryData(QUERY_KEYS.customers.addresses(), addresses);
    if (addresses.length > 0) {
      const defaultShipping = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];
      if (defaultShipping?.id) {
        setShippingAddressId(defaultShipping.id);
        setBillingAddressId(defaultShipping.id);
      }
      onAuthenticated();
      return;
    }
    setStep('address');
  };

  const handleContinueAsGuest = async () => {
    setError(null);
    setGuestPending(true);
    try {
      const guestCartToken = useCartStore.getState().guestCartToken ?? undefined;
      const session = await authApi.checkoutContinueAsGuest({
        ...(guestCartToken ? { guestCartToken } : {}),
        ...getAttributionPayloadForAuth(),
      });
      setSession(session);
      await persistFlashSale();
      queryClient.setQueryData(QUERY_KEYS.customers.addresses(), []);
      onAuthenticated();
    } catch (err) {
      setError(err);
    } finally {
      setGuestPending(false);
    }
  };

  const handleEmailContinue = async () => {
    setError(null);
    setPending(true);
    try {
      const status = await authApi.checkoutEmailStatus(email.trim());
      if (status.exists && status.verified) {
        setStep('password');
        return;
      }
      await authApi.checkoutSendOtp(email.trim());
      setOtp('');
      setResendIn(RESEND_COOLDOWN_SEC);
      setStep('otp');
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    setPending(true);
    try {
      const session = await authApi.login({
        email: email.trim(),
        password,
      });
      setSession(session);
      await afterAuth();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    setPending(true);
    try {
      const result = await authApi.checkoutVerifyOtp(email.trim(), digitsOnly(otp));
      if (result.mode === 'login') {
        setSession(result);
        await afterAuth();
        return;
      }
      setSignupToken(result.signupToken);
      setStep('create_password');
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!signupToken) return;
    setError(null);
    setPending(true);
    try {
      const session = await authApi.checkoutCompleteSignup({
        signupToken,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      setSession(session);
      await afterAuth();
    } catch (err) {
      const code = AppError.isAppError(err) ? err.code : '';
      if (code === 'EMAIL_EXISTS' || code === 'SKU_EXISTS' || code === 'DUPLICATE_KEY') {
        try {
          const session = await authApi.login({
            email: email.trim(),
            password,
          });
          setSession(session);
          await afterAuth();
          return;
        } catch {
          setStep('password');
          setError(
            new AppError('This email is already registered. Sign in with your password.', {
              code: 'EMAIL_EXISTS',
              status: 409,
            }),
          );
          return;
        }
      }
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const handleAddressSubmit = (values: CustomerAddressInput) => {
    setError(null);
    createAddress.mutate(
      {
        ...values,
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
      {
        onSuccess: (address) => {
          setShippingAddressId(address.id);
          setBillingAddressId(address.id);
          onAuthenticated();
        },
        onError: (err) => setError(err),
      },
    );
  };

  const handleResendCode = async () => {
    if (resendIn > 0 || resendPending || pending) return;
    setError(null);
    setResendPending(true);
    try {
      await authApi.checkoutSendOtp(email.trim());
      setResendIn(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err);
    } finally {
      setResendPending(false);
    }
  };

  const handleChangeEmail = () => {
    setError(null);
    setOtp('');
    setPassword('');
    setSignupToken(null);
    setResendIn(0);
    setStep('email');
  };

  const titles: Record<Step, string> = {
    email: 'Secure checkout',
    password: 'Welcome back',
    otp: 'Verify your email',
    create_password: 'Create your account',
    address: 'Shipping address',
  };

  const descriptions: Record<Step, string> = {
    email: 'Enter your email to continue.',
    password: 'Enter your password to continue to checkout.',
    otp: 'Enter the verification code we sent to your email.',
    create_password: 'Almost there — finish your account while the 20% flash sale is on.',
    address: 'Add a shipping address to continue checkout.',
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showClose={false}
        overlayClassName="bg-foreground/25 backdrop-blur-none"
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">{titles[step]}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {descriptions[step]}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' || step === 'create_password' ? <FlashSaleCheckoutPromo /> : null}

        {error ? (
          <AuthErrorAlert
            error={AppError.isAppError(error) ? error : error}
            onRetry={() => setError(null)}
          />
        ) : null}

        {step === 'email' ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="checkout-guest-email">Email</Label>
              <Input
                id="checkout-guest-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <Button
              type="button"
              className="w-full bg-emerald-800 text-white hover:bg-emerald-900"
              disabled={pending || guestPending || !email.includes('@')}
              loading={pending}
              onClick={() => void handleEmailContinue()}
            >
              Continue — keep 20% off
            </Button>

            <div className="relative flex items-center gap-3" role="separator" aria-label="or">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Or
              </span>
              <div className="bg-border h-px flex-1" />
            </div>

            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground w-full font-normal"
              disabled={pending || guestPending}
              loading={guestPending}
              onClick={() => void handleContinueAsGuest()}
            >
              Continue as guest
            </Button>
            <p className="text-muted-foreground/70 text-center text-[11px] leading-relaxed">
              If you log out manually, this guest session will not reopen.
            </p>
          </div>
        ) : null}

        {step === 'password' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">{email}</span>
              <Button
                type="button"
                variant="link"
                className="text-foreground h-auto p-0 text-sm font-medium underline-offset-4"
                onClick={handleChangeEmail}
              >
                Change email
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-guest-password">Password</Label>
              <PasswordField
                id="checkout-guest-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={pending || password.length < 8}
                loading={pending}
                onClick={() => void handleLogin()}
              >
                Sign in & continue
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 'otp' ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Code sent to <span className="text-foreground font-medium">{email}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="checkout-guest-otp">Verification code</Label>
              <Input
                id="checkout-guest-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(digitsOnly(e.target.value).slice(0, 6))}
                maxLength={6}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={pending || digitsOnly(otp).length < 6}
              loading={pending}
              onClick={() => void handleVerifyOtp()}
            >
              Verify
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
              <Button
                type="button"
                variant="link"
                className="text-foreground h-auto p-0 text-sm font-semibold underline underline-offset-4"
                disabled={pending || resendPending}
                onClick={handleChangeEmail}
              >
                Change email
              </Button>
              <span className="text-border" aria-hidden>
                |
              </span>
              <span className="inline-flex items-center gap-2">
                <Button
                  type="button"
                  variant="link"
                  className="text-foreground h-auto p-0 text-sm font-semibold underline underline-offset-4 disabled:no-underline disabled:opacity-50"
                  disabled={pending || resendPending || resendIn > 0}
                  onClick={() => void handleResendCode()}
                >
                  {resendPending ? 'Sending…' : 'Resend code'}
                </Button>
                {resendIn > 0 ? (
                  <span className="text-muted-foreground min-w-8 text-sm font-semibold tabular-nums">
                    {resendIn}s
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        ) : null}

        {step === 'create_password' ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkout-guest-first">First name</Label>
                <Input
                  id="checkout-guest-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-guest-last">Last name</Label>
                <Input
                  id="checkout-guest-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-guest-phone">Phone (optional)</Label>
              <Input
                id="checkout-guest-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-guest-new-password">Create password</Label>
              <PasswordField
                id="checkout-guest-new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                className="w-full"
                disabled={pending || password.length < 8 || !firstName.trim() || !lastName.trim()}
                loading={pending}
                onClick={() => void handleCompleteSignup()}
              >
                Create account & continue
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 'address' ? (
          <AddressForm
            compact
            onSubmit={handleAddressSubmit}
            onCancel={() => {
              setError(null);
              onAuthenticated();
            }}
            isSubmitting={createAddress.isPending}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
