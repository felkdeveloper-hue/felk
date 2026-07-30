import type { AnalyticsFilter } from '@/services/sdk/admin';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
] as const;

interface Props {
  filter: AnalyticsFilter;
  onChange: (f: Partial<AnalyticsFilter>) => void;
  showDevice?: boolean;
  showCountry?: boolean;
}

export function AnalyticsFilterBar({ filter, onChange, showDevice, showCountry }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange({ period: opt.value })}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            filter.period === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {opt.label}
        </button>
      ))}

      {showDevice && (
        <select
          value={filter.device ?? ''}
          onChange={(e) =>
            onChange({ device: (e.target.value as AnalyticsFilter['device']) || undefined })
          }
          className="border-input bg-background rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
      )}

      {showCountry && (
        <input
          type="text"
          value={filter.country ?? ''}
          onChange={(e) => onChange({ country: e.target.value || undefined })}
          placeholder="Country code (e.g. US)"
          className="border-input bg-background w-36 rounded-md border px-2 py-1.5 text-sm"
        />
      )}
    </div>
  );
}
