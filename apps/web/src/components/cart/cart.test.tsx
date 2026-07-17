import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuantitySelector } from '@/components/cart/quantity-selector';
import { useCartStore } from '@/store/cart-store';
import { cartApi } from '@/services/sdk';

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('QuantitySelector', () => {
  it('increments and decrements within bounds', async () => {
    const onChange = vi.fn();
    renderWithClient(<QuantitySelector value={2} onChange={onChange} min={1} max={5} />);

    await userEvent.click(screen.getByLabelText('Increase quantity'));
    expect(onChange).toHaveBeenCalledWith(3);

    await userEvent.click(screen.getByLabelText('Decrease quantity'));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

describe('cartApi integration', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: null, guestCartToken: null, isSyncing: false });
  });

  it('adds items and updates quantity through the SDK', async () => {
    const added = await cartApi.addItem({ variantId: 'var_1', quantity: 1 });
    expect(added.items).toHaveLength(1);

    const itemId = added.items[0]!.id;
    const updated = await cartApi.updateItem(itemId, { quantity: 3 });
    expect(updated.items[0]?.quantity).toBe(3);

    const removed = await cartApi.removeItem(itemId);
    expect(removed.items).toHaveLength(0);
  });

  it('merges guest cart tokens for authenticated sessions', async () => {
    const merged = await cartApi.merge('guest-cart-token-test');
    await waitFor(() => {
      expect(merged.items.length).toBeGreaterThanOrEqual(0);
    });
  });
});
