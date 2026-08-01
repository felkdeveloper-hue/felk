import { useState } from 'react';
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

type Step = 'email' | 'password' | 'otp' | 'create_password' | 'guest_details' | 'address';
type Intent = 'account' | 'guest';

export interface CheckoutGuestAuthDialogProps {
  open: boolean;
  onAuthenticated: () => void;
}

function FirstOrderPromo() {
  return (
    <div className="border-border from-muted/80 to-background bg-linear-to-br rounded-lg border px-4 py-3">
      <p className="text-foreground text-sm font-semibold tracking-tight">
        Create an account — save <span className="text-emerald-700">5%</span> on your first order
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Every first order gets 5% off automatically. Sign up to keep your bag, addresses, and order
        history in one place.
      </p>
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
  const [intent, setIntent] = useState<Intent>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const afterAuth = async () => {
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

  const sendOtpForEmail = async () => {
    await authApi.checkoutSendOtp(email.trim());
    setStep('otp');
  };

  const handleEmailContinue = async (nextIntent: Intent) => {
    setError(null);
    setPending(true);
    setIntent(nextIntent);
    try {
      const status = await authApi.checkoutEmailStatus(email.trim());
      if (status.exists && status.verified) {
        if (nextIntent === 'guest') {
          setError(
            new AppError('This email already has an account. Sign in to continue.', {
              code: 'EMAIL_EXISTS',
              status: 409,
            }),
          );
        }
        setStep('password');
        return;
      }
      await sendOtpForEmail();
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
      const result = await authApi.checkoutVerifyOtp(email.trim(), otp.trim());
      if (result.mode === 'login') {
        setSession(result);
        await afterAuth();
        return;
      }
      setSignupToken(result.signupToken);
      setStep(intent === 'guest' ? 'guest_details' : 'create_password');
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

  const handleCompleteGuest = async () => {
    if (!signupToken) return;
    setError(null);
    setPending(true);
    try {
      const session = await authApi.checkoutCompleteGuest({
        signupToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      setSession(session);
      await afterAuth();
    } catch (err) {
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

  const handleChangeEmail = () => {
    setError(null);
    setOtp('');
    setPassword('');
    setSignupToken(null);
    setIntent('account');
    setStep('email');
  };

  const titles: Record<Step, string> = {
    email: 'Secure checkout',
    password: 'Welcome back',
    otp: 'Verify your email',
    create_password: 'Create your account',
    guest_details: 'Continue as guest',
    address: 'Shipping address',
  };

  const descriptions: Record<Step, string> = {
    email: 'Enter your email to sign in, create an account, or continue as a guest.',
    password: 'Enter your password to continue to checkout.',
    otp: 'Enter the verification code we sent to your email.',
    create_password: 'Set a password to save your details — your first order includes 5% off.',
    guest_details: 'Tell us who to deliver to. You can track this order with your email afterward.',
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

        {step === 'email' || step === 'create_password' ? <FirstOrderPromo /> : null}

        {error ? (
          <AuthErrorAlert
            error={AppError.isAppError(error) ? error : error}
            onRetry={() => setError(null)}
          />
        ) : null}

        {step === 'email' ? (
          <div className="space-y-4">
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
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                className="w-full"
                disabled={pending || !email.includes('@')}
                loading={pending && intent === 'account'}
                onClick={() => void handleEmailContinue('account')}
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending || !email.includes('@')}
                loading={pending && intent === 'guest'}
                onClick={() => void handleEmailContinue('guest')}
              >
                Continue as guest
              </Button>
            </DialogFooter>
            <p className="text-muted-foreground text-center text-xs">
              Guests still receive 5% off on a first order. Create an account anytime after
              checkout.
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                Code sent to <span className="text-foreground font-medium">{email}</span>
              </span>
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
              <Label htmlFor="checkout-guest-otp">Verification code</Label>
              <Input
                id="checkout-guest-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => void handleEmailContinue(intent)}
              >
                Resend code
              </Button>
              <Button
                type="button"
                disabled={pending || otp.trim().length < 4}
                loading={pending}
                onClick={() => void handleVerifyOtp()}
              >
                Verify
              </Button>
            </DialogFooter>
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
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                className="w-full"
                disabled={pending || password.length < 8 || !firstName.trim() || !lastName.trim()}
                loading={pending}
                onClick={() => void handleCompleteSignup()}
              >
                Create account & continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={pending || !signupToken}
                onClick={() => setStep('guest_details')}
              >
                Prefer guest checkout instead
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 'guest_details' ? (
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkout-guest-only-first">First name</Label>
                <Input
                  id="checkout-guest-only-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-guest-only-last">Last name</Label>
                <Input
                  id="checkout-guest-only-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-guest-only-phone">Phone (optional)</Label>
              <Input
                id="checkout-guest-only-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                type="button"
                className="w-full"
                disabled={pending || !firstName.trim() || !lastName.trim()}
                loading={pending}
                onClick={() => void handleCompleteGuest()}
              >
                Continue as guest
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={pending}
                onClick={() => {
                  setIntent('account');
                  setStep('create_password');
                }}
              >
                Create an account instead
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {step === 'address' ? (
          <AddressForm
            onSubmit={handleAddressSubmit}
            onCancel={() => undefined}
            isSubmitting={createAddress.isPending}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
