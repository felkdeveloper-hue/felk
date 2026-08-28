import { describe, expect, it } from 'vitest';
import { evaluateAnalyticsBotFilter } from './bot-filter.util.js';

describe('bot filter', () => {
  it('allows normal browsers', () => {
    expect(
      evaluateAnalyticsBotFilter({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        path: '/',
      }).exclude,
    ).toBe(false);
  });

  it('blocks googlebot and empty UA', () => {
    expect(
      evaluateAnalyticsBotFilter({
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      }).exclude,
    ).toBe(true);
    expect(evaluateAnalyticsBotFilter({ userAgent: '' }).exclude).toBe(true);
    expect(evaluateAnalyticsBotFilter({ userAgent: '   ' }).reason).toBe('empty_user_agent');
  });

  it('blocks health-check paths', () => {
    expect(
      evaluateAnalyticsBotFilter({
        userAgent: 'Mozilla/5.0',
        path: '/health',
      }).exclude,
    ).toBe(true);
  });

  it('can be disabled', () => {
    expect(
      evaluateAnalyticsBotFilter({
        userAgent: 'Googlebot',
        enabled: false,
      }).exclude,
    ).toBe(false);
  });
});
