import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackPageView, trackEvent, getMeasurementId } from '../lib/analytics';

describe('Google Analytics & GTM Tracker', () => {
  beforeEach(() => {
    // Reset window.gtag and window.dataLayer
    delete (window as unknown as { gtag?: unknown }).gtag;
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
  });

  it('safely handles trackPageView when gtag is not defined', () => {
    expect(() => trackPageView('/r/some-token', 'Candidate Scorecard')).not.toThrow();
    expect(window.dataLayer).toEqual([
      expect.objectContaining({
        event: 'page_view',
        page_path: '/r/some-token',
        page_title: 'Candidate Scorecard',
      }),
    ]);
  });

  it('safely handles trackEvent when gtag is not defined', () => {
    expect(() =>
      trackEvent('evaluation_published', { track: 'DSA / LeetCode', verdict: 'Hire' })
    ).not.toThrow();
    expect(window.dataLayer).toEqual([
      {
        event: 'evaluation_published',
        track: 'DSA / LeetCode',
        verdict: 'Hire',
      },
    ]);
  });

  it('dispatches page_view to window.gtag and window.dataLayer', () => {
    const mockGtag = vi.fn();
    (window as unknown as { gtag: typeof mockGtag }).gtag = mockGtag;

    trackPageView('/admin?tab=questions', 'Question Bank');

    // Always pushes to dataLayer for GTM
    expect(window.dataLayer).toEqual([
      expect.objectContaining({
        event: 'page_view',
        page_path: '/admin?tab=questions',
        page_title: 'Question Bank',
      }),
    ]);

    const id = getMeasurementId();
    if (id) {
      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
        page_path: '/admin?tab=questions',
        page_title: 'Question Bank',
        page_location: window.location.href,
      });
    }
  });

  it('dispatches custom event to window.gtag and window.dataLayer', () => {
    const mockGtag = vi.fn();
    (window as unknown as { gtag: typeof mockGtag }).gtag = mockGtag;

    trackEvent('scorecard_link_copied', { track: 'System Design' });

    // Always pushes to dataLayer for GTM
    expect(window.dataLayer).toEqual([
      {
        event: 'scorecard_link_copied',
        track: 'System Design',
      },
    ]);

    const id = getMeasurementId();
    if (id) {
      expect(mockGtag).toHaveBeenCalledWith('event', 'scorecard_link_copied', {
        track: 'System Design',
      });
    }
  });
});
