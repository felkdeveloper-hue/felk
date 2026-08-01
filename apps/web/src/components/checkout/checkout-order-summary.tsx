import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import type { CheckoutSession } from '@/services/sdk';
import { Image } from '@/components/media/image';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/cart/quantity-selector';
import { useRemoveCartItemMutation, useUpdateCartItemMutation } from '@/hooks/cart';
import { useCancelCheckoutMutation, useRefreshCheckoutMutation } from '@/hooks/checkout';
import { useCheckoutStore } from '@/store';
import { QUERY_KEYS, ROUTES } from '@/constants';
import { trackCommerceEvent } from '@/lib/analytics';

export interface CheckoutOrderSummaryProps {
  session: CheckoutSession;
  /** When true, allow qty +/- and remove (Information step only). */
  editable?: boolean;
}

export function CheckoutOrderSummary({ session, editable = false }: CheckoutOrderSummaryProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { totals, currency } = session;
  const updateMutation = useUpdateCartItemMutation();
  const removeMutation = useRemoveCartItemMutation();
  const refreshCheckout = useRefreshCheckoutMutation();
  const cancelCheckout = useCancelCheckoutMutation();

  // Optimistic line list — remove/qty update instantly, then sync server in background.
  const cached = queryClient.getQueryData<CheckoutSession>(
    QUERY_KEYS.checkout.detail(session.checkoutToken),
  );
  const lines = cached?.lines ?? session.lines;
  const displayTotals = cached?.totals ?? totals;

  const patchSessionLines = (nextLines: CheckoutSession['lines']) => {
    const next: CheckoutSession = {
      ...session,
      ...(cached ?? {}),
      lines: nextLines,
      totals: {
        ...displayTotals,
        subtotal: nextLines.reduce((sum, line) => sum + line.lineSubtotal, 0),
        totalQuantity: nextLines.reduce((sum, line) => sum + line.quantity, 0),
        grandTotal:
          nextLines.reduce((sum, line) => sum + line.lineSubtotal, 0) +
          (displayTotals.shipping ?? 0) +
          (displayTotals.tax ?? 0) -
          (displayTotals.discount ?? 0) -
          (displayTotals.giftCard ?? 0),
      },
    };
    queryClient.setQueryData(QUERY_KEYS.checkout.detail(session.checkoutToken), next);
    if (session.id) {
      queryClient.setQueryData(QUERY_KEYS.checkout.detail(session.id), next);
    }
  };

  const syncCheckoutAfterCartChange = (nextLineCountHint?: number) => {
    const token = session.checkoutToken;
    if (!token) return;

    if (typeof nextLineCountHint === 'number' && nextLineCountHint <= 0) {
      cancelCheckout.mutate(token, {
        onSettled: () => {
          useCheckoutStore.getState().resetCheckoutUi();
          void navigate({ to: ROUTES.cart });
        },
      });
      return;
    }

    refreshCheckout.mutate({
      checkoutRef: token,
      payload: {},
    });
  };

  return (
    <aside className="border-border/70 bg-card/90 rounded-[1.75rem] border p-6 shadow-[var(--shadow-elevated)] backdrop-blur">
      <h2 className="font-display text-lg font-bold uppercase tracking-tight">Order summary</h2>
      <ul className="mt-4 space-y-4">
        {lines.map((line) => {
          const cartItemId = line.cartItemId;
          const canEdit = editable && Boolean(cartItemId);

          return (
            <li key={`${line.variantId}-${cartItemId ?? line.sku}`} className="flex gap-3 text-sm">
              <div className="border-border size-14 shrink-0 overflow-hidden rounded-2xl border">
                <Image
                  src={line.thumbnailUrl}
                  alt={line.title}
                  aspectRatio="1/1"
                  containerClassName="size-full"
                  className="size-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{line.title}</p>
                    {(line.colorName || line.sizeName) && (
                      <p className="text-muted-foreground">
                        {[line.colorName, line.sizeName].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-medium">
                    {formatCurrency(line.lineSubtotal, currency)}
                  </p>
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <QuantitySelector
                      value={line.quantity}
                      min={0}
                      max={99}
                      loading={false}
                      onChange={(quantity) => {
                        if (!cartItemId) return;
                        if (quantity === 0) {
                          const nextLines = lines.filter((l) => l.cartItemId !== cartItemId);
                          patchSessionLines(nextLines);
                          removeMutation.mutate(cartItemId, {
                            onSuccess: () => {
                              trackCommerceEvent('remove_from_cart', {
                                productId: line.productId,
                                variantId: line.variantId,
                                quantity: line.quantity,
                              });
                              syncCheckoutAfterCartChange(nextLines.length);
                            },
                            onError: () => {
                              syncCheckoutAfterCartChange();
                            },
                          });
                          return;
                        }
                        const increased = quantity > line.quantity;
                        patchSessionLines(
                          lines.map((l) =>
                            l.cartItemId === cartItemId
                              ? {
                                  ...l,
                                  quantity,
                                  lineSubtotal: (l.salePrice ?? l.unitPrice) * quantity,
                                }
                              : l,
                          ),
                        );
                        updateMutation.mutate(
                          { itemId: cartItemId, payload: { quantity } },
                          {
                            onSuccess: () => {
                              trackCommerceEvent(
                                increased ? 'quantity_increased' : 'quantity_decreased',
                                {
                                  productId: line.productId,
                                  variantId: line.variantId,
                                  quantity,
                                },
                              );
                              syncCheckoutAfterCartChange();
                            },
                            onError: () => {
                              syncCheckoutAfterCartChange();
                            },
                          },
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8 px-2"
                      onClick={() => {
                        if (!cartItemId) return;
                        const nextLines = lines.filter((l) => l.cartItemId !== cartItemId);
                        patchSessionLines(nextLines);
                        removeMutation.mutate(cartItemId, {
                          onSuccess: () => {
                            trackCommerceEvent('remove_from_cart', {
                              productId: line.productId,
                              variantId: line.variantId,
                              quantity: line.quantity,
                            });
                            syncCheckoutAfterCartChange(nextLines.length);
                          },
                          onError: () => {
                            syncCheckoutAfterCartChange();
                          },
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Qty {line.quantity}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Separator className="my-4" />

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatCurrency(displayTotals.subtotal, currency)}</dd>
        </div>
        {displayTotals.discount > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <dt>Discount</dt>
            <dd>-{formatCurrency(displayTotals.discount, currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>{formatCurrency(displayTotals.shipping, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd>{formatCurrency(displayTotals.tax, currency)}</dd>
        </div>
        {(displayTotals.giftCard ?? 0) > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <dt>Gift card</dt>
            <dd>-{formatCurrency(displayTotals.giftCard ?? 0, currency)}</dd>
          </div>
        ) : null}
      </dl>

      <Separator className="my-4" />

      <div className="flex justify-between text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(displayTotals.grandTotal, currency)}</span>
      </div>
    </aside>
  );
}
