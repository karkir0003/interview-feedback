import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicScorecardPage } from '../pages/PublicScorecardPage';
import { HomePage } from '../pages/HomePage';
import * as AuthModule from '../contexts/AuthContext';
import * as AnalyticsModule from '../lib/analytics';
import { ToastProvider } from '../components/common/Toast';
import { supabase } from '../lib/supabase';

const mockScorecardData = {
  id: 'eval-123',
  candidate_name: 'Alex Chen',
  interview_type_name: 'DSA / LeetCode',
  question_title: 'LRU Cache',
  hireability: 'Strong Hire',
  overall_feedback: 'Demonstrated solid understanding of doubly linked lists.',
  created_at: '2026-11-14T10:00:00Z',
  scores: [
    {
      category: 'Problem Solving',
      criterion_key: 'problem_solving',
      score: 4,
      notes: 'Good decomposition',
      definition: 'Level 4 Strong',
    },
  ],
};

describe('Standardized UTM Attribution & Interaction Tracking', () => {
  let trackEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    trackEventSpy = vi.spyOn(AnalyticsModule, 'trackEvent');

    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAdmin: false,
      isInterviewer: false,
      canGrade: false,
      isLoading: false,
      isConfigured: true,
      signInWithPassword: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: mockScorecardData,
      error: null,
    } as any);

    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    } as any);
  });

  describe('PublicScorecardPage Tracking', () => {
    it('dispatches scorecard_viewed on load and renders Stripe tip link with web UTMs', async () => {
      render(
        <MemoryRouter initialEntries={['/r/fake-token']}>
          <ToastProvider>
            <Routes>
              <Route path="/r/:token" element={<PublicScorecardPage />} />
              <Route path="/login" element={<div />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alex Chen's Evaluation")).toBeDefined();
      });

      // Verify automatic view tracking
      expect(trackEventSpy).toHaveBeenCalledWith('scorecard_viewed', {
        track: 'DSA / LeetCode',
        verdict: 'Strong Hire',
      });

      // Verify Stripe CTA URL structure
      const tipButton = screen.getByRole('link', { name: /leave a tip/i });
      expect(tipButton).toBeDefined();

      const href = tipButton.getAttribute('href') || '';
      const url = new URL(href);

      expect(url.hostname).toBe('buy.stripe.com');
      expect(url.searchParams.get('utm_source')).toBe('mocksignal');
      expect(url.searchParams.get('utm_medium')).toBe('web');
      expect(url.searchParams.get('utm_campaign')).toBe('candidate_scorecard');
      expect(url.searchParams.get('utm_content')).toBe('stripe_tip_scorecard');

      // Click tip button and assert analytics dispatch
      fireEvent.click(tipButton);
      expect(trackEventSpy).toHaveBeenCalledWith('tip_button_clicked', {
        platform: 'stripe',
        source: 'cta_button',
      });
    });

    it('tracks scorecard_login_banner_clicked when candidate clicks login CTA', async () => {
      render(
        <MemoryRouter initialEntries={['/r/fake-token']}>
          <ToastProvider>
            <Routes>
              <Route path="/r/:token" element={<PublicScorecardPage />} />
              <Route path="/login" element={<div />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alex Chen's Evaluation")).toBeDefined();
      });

      const loginLink = screen.getByRole('link', { name: /sign in with email/i });
      expect(loginLink.getAttribute('href')).toBe('/login?redirect=/history');

      fireEvent.click(loginLink);
      expect(trackEventSpy).toHaveBeenCalledWith('scorecard_login_banner_clicked');
    });

    it('copies canonical scorecard URL without stale UTMs and tracks scorecard_link_copied', async () => {
      // Candidate lands on scorecard from an email with existing email UTMs in URL
      const initialEntry =
        '/r/fake-token?utm_source=mocksignal&utm_medium=email&utm_campaign=interview_evaluation&utm_content=view_scorecard_cta';

      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <ToastProvider>
            <Routes>
              <Route path="/r/:token" element={<PublicScorecardPage />} />
              <Route path="/login" element={<div />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Alex Chen's Evaluation")).toBeDefined();
      });

      const shareButton = screen.getByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      // Must copy clean canonical URL without any of the email UTMs
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:3000/r/fake-token');
      expect(trackEventSpy).toHaveBeenCalledWith('scorecard_link_copied', {
        track: 'DSA / LeetCode',
      });
    });
  });

  describe('HomePage Interaction Tracking', () => {
    it('tracks home_signin_cta_clicked and read_documentation_clicked', () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      const signinBtn = screen.getByRole('link', { name: /sign in to access scorecards/i });
      fireEvent.click(signinBtn);
      expect(trackEventSpy).toHaveBeenCalledWith('home_signin_cta_clicked');

      const docLink = screen.getByRole('link', { name: /read documentation/i });
      fireEvent.click(docLink);
      expect(trackEventSpy).toHaveBeenCalledWith('read_documentation_clicked');
    });
  });
});
