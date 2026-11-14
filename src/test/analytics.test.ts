import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackPageView, trackEvent, getMeasurementId } from '../lib/analytics';

describe('Google Analytics Tracker', () => {
  beforeEach(() => {
    // Reset window.gtag
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it('safely handles trackPageView when gtag is not defined', () => {
    expect(() => trackPageView('/r/some-token', 'Candidate Scorecard')).not.toThrow();
  });

  it('safely handles trackEvent when gtag is not defined', () => {
    expect(() =>
      trackEvent('evaluation_published', { track: 'DSA / LeetCode', verdict: 'Hire' })
    ).not.toThrow();
  });

  it('dispatches page_view to window.gtag with tracking ID', () => {
    const mockGtag = vi.fn();
    (window as unknown as { gtag: typeof mockGtag }).gtag = mockGtag;

    trackPageView('/admin?tab=questions', 'Question Bank');

    const id = getMeasurementId();
    if (id) {
      expect(mockGtag).toHaveBeenCalledWith('config', id, {
        page_path: '/admin?tab=questions',
        page_title: 'Question Bank',
      });
    }
  });

  it('dispatches custom event to window.gtag with parameters', () => {
    const mockGtag = vi.fn();
    (window as unknown as { gtag: typeof mockGtag }).gtag = mockGtag;

    trackEvent('scorecard_link_copied', { track: 'System Design' });

    const id = getMeasurementId();
    if (id) {
      expect(mockGtag).toHaveBeenCalledWith('event', 'scorecard_link_copied', {
        track: 'System Design',
      });
    }
  });
});
