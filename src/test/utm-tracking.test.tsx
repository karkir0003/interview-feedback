import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PublicScorecardPage } from '../pages/PublicScorecardPage';
import * as AuthModule from '../contexts/AuthContext';
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

describe('Standardized UTM Attribution Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

  it('renders Stripe tip links on scorecard with standardized web UTM parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/r/fake-token']}>
        <ToastProvider>
          <Routes>
            <Route path="/r/:token" element={<PublicScorecardPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for the scorecard data to load
    await waitFor(() => {
      expect(screen.getByText("Alex Chen's Evaluation")).toBeDefined();
    });

    const tipButton = screen.getByRole('link', { name: /leave a tip/i });
    expect(tipButton).toBeDefined();

    const href = tipButton.getAttribute('href') || '';
    const url = new URL(href);

    expect(url.hostname).toBe('buy.stripe.com');
    expect(url.searchParams.get('utm_source')).toBe('mocksignal');
    expect(url.searchParams.get('utm_medium')).toBe('web');
    expect(url.searchParams.get('utm_campaign')).toBe('candidate_scorecard');
    expect(url.searchParams.get('utm_content')).toBe('stripe_tip_scorecard');
  });

  it('renders sign-in with email link with redirect to /history in the unauthenticated banner', async () => {
    render(
      <MemoryRouter initialEntries={['/r/fake-token']}>
        <ToastProvider>
          <Routes>
            <Route path="/r/:token" element={<PublicScorecardPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex Chen's Evaluation")).toBeDefined();
    });

    const loginLink = screen.getByRole('link', { name: /sign in with email/i });
    expect(loginLink.getAttribute('href')).toBe('/login?redirect=/history');
  });
});
