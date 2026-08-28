import { describe, expect, it } from 'vitest';
import { normalizeMetaInsightRow } from '../analytics/meta-marketing-api.service.js';

describe('normalizeMetaInsightRow', () => {
  it('maps genuine Meta fields and leaves missing metrics as null', () => {
    const row = normalizeMetaInsightRow({
      date_start: '2026-08-01',
      date_stop: '2026-08-01',
      campaign_id: '1',
      campaign_name: 'Summer',
      adset_id: '2',
      ad_id: '3',
      reach: '100',
      impressions: '250',
      inline_link_clicks: '12',
      spend: '4.50',
      cpc: '0.375',
      cpm: '18',
      ctr: '4.8',
      account_currency: 'LKR',
      actions: [
        { action_type: 'landing_page_view', value: '8' },
        { action_type: 'link_click', value: '12' },
      ],
      outbound_clicks: [{ action_type: 'outbound_click', value: '10' }],
    });

    expect(row.dateStart).toBe('2026-08-01');
    expect(row.reach).toBe(100);
    expect(row.impressions).toBe(250);
    expect(row.linkClicks).toBe(12);
    expect(row.landingPageViews).toBe(8);
    expect(row.outboundClicks).toBe(10);
    expect(row.spend).toBe(4.5);
    expect(row.currency).toBe('LKR');
  });

  it('does not invent zeros for missing fields', () => {
    const row = normalizeMetaInsightRow({
      date_start: '2026-08-01',
      impressions: '10',
    });
    expect(row.reach).toBeNull();
    expect(row.landingPageViews).toBeNull();
    expect(row.outboundClicks).toBeNull();
    expect(row.spend).toBeNull();
    expect(row.linkClicks).toBeNull();
  });

  it('falls back from clicks when inline_link_clicks absent', () => {
    const row = normalizeMetaInsightRow({
      date_start: '2026-08-01',
      clicks: '5',
      actions: [{ action_type: 'link_click', value: '4' }],
    });
    // Prefer action link_click over generic clicks when inline missing
    expect(row.linkClicks).toBe(4);
  });
});
