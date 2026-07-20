import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sweepPending, type RetrySweepDoc } from '@/services/retry-sweep.service';
import type { Model } from 'mongoose';

function makeDoc(
  overrides?: Partial<RetrySweepDoc>,
): RetrySweepDoc & { set: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> } {
  const save = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn();
  return {
    _id: 'doc-1',
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: null,
    lastError: null,
    set,
    save,
    ...overrides,
  } as unknown as RetrySweepDoc & { set: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
}

function makeModel(docs: ReturnType<typeof makeDoc>[]) {
  const findByIdResult = vi.fn().mockImplementation((id: string) => {
    const found = docs.find((d) => (d as { _id: string })._id === id);
    return Promise.resolve(found ?? null);
  });

  return {
    find: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(docs),
        }),
      }),
    }),
    findById: findByIdResult,
  } as unknown as Model<RetrySweepDoc>;
}

describe('sweepPending', () => {
  it('marks document as sent on success', async () => {
    const doc = makeDoc();
    const model = makeModel([doc]);
    const sender = vi.fn().mockResolvedValue(undefined);

    await sweepPending(model, sender, 'TestQueue');

    expect(sender).toHaveBeenCalledWith(doc);
    expect(doc.set).toHaveBeenCalledWith('status', 'sent');
    expect(doc.save).toHaveBeenCalledOnce();
  });

  it('marks document as retrying on failure with remaining attempts', async () => {
    const doc = makeDoc({ attempts: 0, maxAttempts: 3 });
    const model = makeModel([doc]);
    const sender = vi.fn().mockRejectedValue(new Error('Network error'));

    await sweepPending(model, sender, 'TestQueue');

    expect(doc.set).toHaveBeenCalledWith('status', 'retrying');
    expect(doc.set).toHaveBeenCalledWith('lastError', 'Network error');
    expect(doc.set).toHaveBeenCalledWith(
      expect.stringContaining('nextAttemptAt'),
      expect.any(Date),
    );
  });

  it('marks document as failed after max attempts', async () => {
    const doc = makeDoc({ attempts: 2, maxAttempts: 3 });
    const model = makeModel([doc]);
    const sender = vi.fn().mockRejectedValue(new Error('Still failing'));

    await sweepPending(model, sender, 'TestQueue');

    expect(doc.set).toHaveBeenCalledWith('status', 'failed');
  });

  it('processes no documents when none are pending', async () => {
    const model = makeModel([]);
    const sender = vi.fn();

    await sweepPending(model, sender, 'TestQueue');

    expect(sender).not.toHaveBeenCalled();
  });
});
