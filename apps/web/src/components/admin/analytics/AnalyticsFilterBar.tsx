import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cmsApi } from '@/services/sdk/admin/cms';
import { useEventNames } from '@/hooks/admin/use-analytics';
import type { AnalyticsFilter, AnalyticsPeriod } from '@/services/sdk/admin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type AnalyticsFilterField =
  | 'period'
  | 'userId'
  | 'productId'
  | 'category'
  | 'brandId'
  | 'orderStatus'
  | 'trafficSource'
  | 'device'
  | 'browser'
  | 'country'
  | 'city'
  | 'sessionId'
  | 'eventName'
  | 'q';

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'custom', label: 'Custom' },
];

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packed',
  'ready_for_shipment',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'returned',
  'refund_pending',
  'refunded',
] as const;

const TRAFFIC_SOURCES = [
  { value: 'direct', label: 'Direct' },
  { value: 'organic_search', label: 'Organic Search' },
  { value: 'paid_search', label: 'Paid Ads' },
  { value: 'social', label: 'Social' },
  { value: 'email', label: 'Email' },
  { value: 'referral', label: 'Referral' },
  { value: 'display', label: 'Display' },
] as const;

const BROWSERS = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Opera', 'Samsung Internet'] as const;

const ADVANCED_FIELDS: AnalyticsFilterField[] = [
  'userId',
  'productId',
  'category',
  'brandId',
  'orderStatus',
  'trafficSource',
  'device',
  'browser',
  'country',
  'city',
  'sessionId',
  'eventName',
  'q',
];

const DEFAULT_VISIBLE: AnalyticsFilterField[] = ['period', ...ADVANCED_FIELDS];

interface Props {
  filter: AnalyticsFilter;
  onChange: (f: Partial<AnalyticsFilter>) => void;
  onClear?: () => void;
  /** Fields to show. Defaults to full set. */
  visible?: AnalyticsFilterField[];
  /** @deprecated use visible */
  showDevice?: boolean;
  /** @deprecated use visible */
  showCountry?: boolean;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function fromDateStart(date: string): string {
  return new Date(`${date}T00:00:00.000`).toISOString();
}

function fromDateEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

const selectClass = 'border-input bg-background h-9 rounded-md border px-2 text-sm min-w-[8rem]';
const inputClass = 'h-9 max-w-[11rem] text-sm';

export function AnalyticsFilterBar({
  filter,
  onChange,
  onClear,
  visible,
  showDevice,
  showCountry,
}: Props) {
  const [open, setOpen] = useState(false);

  const fields = useMemo(() => {
    if (visible) return new Set(visible);
    const set = new Set(DEFAULT_VISIBLE);
    // Legacy props: if explicitly false-ish via only those flags — keep defaults
    if (showDevice === false) set.delete('device');
    if (showCountry === false) set.delete('country');
    return set;
  }, [visible, showDevice, showCountry]);

  const showPeriod = fields.has('period');
  const advanced = ADVANCED_FIELDS.filter((f) => fields.has(f));
  const showEventNames = fields.has('eventName');

  const categories = useQuery({
    queryKey: ['analytics-filter', 'categories'],
    queryFn: () => cmsApi.categories.list({ limit: 100 }),
    staleTime: 5 * 60_000,
    enabled: fields.has('category'),
  });

  const brands = useQuery({
    queryKey: ['analytics-filter', 'brands'],
    queryFn: () => cmsApi.brands.list({ limit: 100 }),
    staleTime: 5 * 60_000,
    enabled: fields.has('brandId'),
  });

  const eventNames = useEventNames(
    showEventNames ? { period: filter.period ?? '30d', from: filter.from, to: filter.to } : {},
  );

  const chips = useMemo(() => {
    const items: Array<{ key: keyof AnalyticsFilter; label: string }> = [];
    if (filter.userId)
      items.push({ key: 'userId', label: `Customer: ${filter.userId.slice(0, 8)}…` });
    if (filter.productId)
      items.push({ key: 'productId', label: `Product: ${filter.productId.slice(0, 8)}…` });
    if (filter.category) items.push({ key: 'category', label: `Category: ${filter.category}` });
    if (filter.brandId)
      items.push({ key: 'brandId', label: `Brand: ${filter.brandId.slice(0, 8)}…` });
    if (filter.orderStatus)
      items.push({ key: 'orderStatus', label: `Status: ${filter.orderStatus}` });
    if (filter.trafficSource)
      items.push({ key: 'trafficSource', label: `Source: ${filter.trafficSource}` });
    if (filter.device) items.push({ key: 'device', label: `Device: ${filter.device}` });
    if (filter.browser) items.push({ key: 'browser', label: `Browser: ${filter.browser}` });
    if (filter.country) items.push({ key: 'country', label: `Country: ${filter.country}` });
    if (filter.city) items.push({ key: 'city', label: `City: ${filter.city}` });
    if (filter.sessionId)
      items.push({ key: 'sessionId', label: `Session: ${filter.sessionId.slice(0, 8)}…` });
    if (filter.eventName) items.push({ key: 'eventName', label: `Event: ${filter.eventName}` });
    if (filter.q) items.push({ key: 'q', label: `Search: ${filter.q}` });
    return items;
  }, [filter]);

  const hasAdvancedActive = chips.length > 0;

  return (
    <div className="space-y-2">
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {showPeriod
          ? PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ period: opt.value })}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors sm:rounded-md sm:py-1.5 ${
                  filter.period === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))
          : null}

        {showPeriod && filter.period === 'custom' ? (
          <>
            <Input
              type="date"
              className={inputClass}
              value={toDateInputValue(filter.from)}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  period: 'custom',
                  from: v ? fromDateStart(v) : undefined,
                  to: filter.to,
                });
              }}
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              className={inputClass}
              value={toDateInputValue(filter.to)}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  period: 'custom',
                  from: filter.from,
                  to: v ? fromDateEnd(v) : undefined,
                });
              }}
            />
          </>
        ) : null}

        {advanced.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1"
            onClick={() => setOpen((o) => !o)}
          >
            More filters
            {hasAdvancedActive ? (
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
                {chips.length}
              </span>
            ) : null}
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        ) : null}

        {onClear && (hasAdvancedActive || filter.period === 'custom' || Boolean(filter.from)) ? (
          <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>

      {open && advanced.length > 0 ? (
        <div className="bg-muted/40 grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fields.has('userId') ? (
            <Field label="Customer ID">
              <Input
                className={inputClass}
                value={filter.userId ?? ''}
                placeholder="User ID"
                onChange={(e) => onChange({ userId: e.target.value || undefined })}
              />
            </Field>
          ) : null}
          {fields.has('productId') ? (
            <Field label="Product ID">
              <Input
                className={inputClass}
                value={filter.productId ?? ''}
                placeholder="Product ID"
                onChange={(e) => onChange({ productId: e.target.value || undefined })}
              />
            </Field>
          ) : null}
          {fields.has('category') ? (
            <Field label="Category">
              <select
                className={selectClass}
                value={filter.category ?? ''}
                onChange={(e) => onChange({ category: e.target.value || undefined })}
              >
                <option value="">All categories</option>
                {(categories.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.has('brandId') ? (
            <Field label="Brand">
              <select
                className={selectClass}
                value={filter.brandId ?? ''}
                onChange={(e) => onChange({ brandId: e.target.value || undefined })}
              >
                <option value="">All brands</option>
                {(brands.data?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.has('orderStatus') ? (
            <Field label="Order status">
              <select
                className={selectClass}
                value={filter.orderStatus ?? ''}
                onChange={(e) => onChange({ orderStatus: e.target.value || undefined })}
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.has('trafficSource') ? (
            <Field label="Traffic source">
              <select
                className={selectClass}
                value={filter.trafficSource ?? ''}
                onChange={(e) => onChange({ trafficSource: e.target.value || undefined })}
              >
                <option value="">All sources</option>
                {TRAFFIC_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.has('device') ? (
            <Field label="Device">
              <select
                className={selectClass}
                value={filter.device ?? ''}
                onChange={(e) =>
                  onChange({
                    device: (e.target.value as AnalyticsFilter['device']) || undefined,
                  })
                }
              >
                <option value="">All devices</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </Field>
          ) : null}
          {fields.has('browser') ? (
            <Field label="Browser">
              <select
                className={selectClass}
                value={filter.browser ?? ''}
                onChange={(e) => onChange({ browser: e.target.value || undefined })}
              >
                <option value="">All browsers</option>
                {BROWSERS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.has('country') ? (
            <Field label="Country">
              <Input
                className={inputClass}
                value={filter.country ?? ''}
                placeholder="e.g. US"
                onChange={(e) => onChange({ country: e.target.value || undefined })}
              />
            </Field>
          ) : null}
          {fields.has('city') ? (
            <Field label="City">
              <Input
                className={inputClass}
                value={filter.city ?? ''}
                placeholder="City"
                onChange={(e) => onChange({ city: e.target.value || undefined })}
              />
            </Field>
          ) : null}
          {fields.has('sessionId') ? (
            <Field label="Session ID">
              <Input
                className={inputClass}
                value={filter.sessionId ?? ''}
                placeholder="Session ID"
                onChange={(e) => onChange({ sessionId: e.target.value || undefined })}
              />
            </Field>
          ) : null}
          {fields.has('eventName') ? (
            <Field label="Event type">
              <select
                className={selectClass}
                value={filter.eventName ?? ''}
                onChange={(e) => onChange({ eventName: e.target.value || undefined })}
              >
                <option value="">All events</option>
                {(eventNames.data ?? []).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fields.has('q') ? (
            <Field label="Search">
              <Input
                className={inputClass}
                value={filter.q ?? ''}
                placeholder="Session / path search"
                onChange={(e) => onChange({ q: e.target.value || undefined })}
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onChange({ [chip.key]: undefined })}
              className="bg-muted text-muted-foreground hover:bg-muted/80 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground font-medium">{label}</span>
      {children}
    </label>
  );
}
