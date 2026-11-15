import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublicScorecardPage } from '../pages/PublicScorecardPage';
import { ToastProvider } from '../components/common/Toast';
import * as AuthModule from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const mockScorecardData = {
  id: 'eval-123',
  candidate_name: 'Alex Chen',
  interview_type_name: 'DSA / LeetCode',
  question_title: 'LRU Cache',
  hireability: 'Strong Hire',
  overall_feedback: 'Outstanding algorithmic analysis and clean hash-map linked-list implementation.',
  interviewed_at: '2026-11-14',
  scores: [
    {
      criterion_key: 'optimality',
      criterion_label: 'Optimality of solution',
      score: 4,
      justification: 'Independently identified O(1) doubly linked list + map approach.',
    },
    {
      criterion_key: 'complexity',
      criterion_label: 'Ability to analyze time and space complexity',
      score: 5,
      justification: 'Precisely detailed amortized and worst-case time and space constraints.',
    },
  ],
};

const mockCriteriaData = [
  {
    id: 'c-1',
    interview_type_id: 'dsa',
    criterion_key: 'optimality',
    label: 'Optimality of solution',
    display_order: 1,
    is_active: true,
    scale_descriptions: {
      '1': 'Level 1 Very Poor',
      '2': 'Level 2 Below Bar',
      '3': 'Level 3 Meets Bar',
      '4': 'Level 4 Strong: independently identifies optimal algorithm',
      '5': 'Level 5 Exceptional',
    },
  },
  {
    id: 'c-2',
    interview_type_id: 'dsa',
    criterion_key: 'complexity',
    label: 'Ability to analyze time and space complexity',
    display_order: 2,
    is_active: true,
    scale_descriptions: {
      '1': 'Complexity 1',
      '2': 'Complexity 2',
      '3': 'Complexity 3',
      '4': 'Complexity 4',
      '5': 'Complexity 5: tight amortized analysis',
    },
  },
];

describe('Public Candidate Scorecard: Rubric Benchmark Visualizations', () => {
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
        eq: vi.fn().mockResolvedValue({ data: mockCriteriaData, error: null }),
      }),
    } as any);
  });

  it('renders executive summary, verdict, and rubric competency evaluations', async () => {
    render(
      <MemoryRouter initialEntries={['/r/fake-public-token']}>
        <ToastProvider>
          <Routes>
            <Route path="/r/:token" element={<PublicScorecardPage />} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for scorecard to load
    await waitFor(() => {
      expect(screen.getByText("Alex Chen's Evaluation")).toBeDefined();
    });

    // Check TLDR header elements
    expect(screen.getByText('Strong Hire')).toBeDefined();
    expect(screen.getByText('LRU Cache')).toBeDefined();

    // Check "What this evaluates" competency description for both axes
    expect(screen.getAllByText(/What this evaluates:/).length).toBe(2);

    // Check "What your score means" achieved benchmark highlight
    expect(
      screen.getByText(/What your score means \(Strong\):/)
    ).toBeDefined();
    expect(
      screen.getByText('Level 4 Strong: independently identifies optimal algorithm')
    ).toBeDefined();
  });

  it('expands full 1–5 calibration scale when user clicks expand', async () => {
    render(
      <MemoryRouter initialEntries={['/r/fake-public-token']}>
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

    // Click "Explore full 1–5 rubric levels & benchmarks"
    const expandButtons = screen.getAllByText('Explore full 1–5 rubric levels & benchmarks');
    fireEvent.click(expandButtons[0]);

    // Verify all 5 levels are now rendered
    expect(screen.getByText('Level 1 • Very Poor')).toBeDefined();
    expect(screen.getByText('Level 2 • Below Bar')).toBeDefined();
    expect(screen.getByText('Level 3 • Meets Bar')).toBeDefined();
    expect(screen.getByText('Level 4 • Strong')).toBeDefined();
    expect(screen.getByText('Level 5 • Exceptional')).toBeDefined();

    // Verify "Achieved" pill is shown for Level 4
    expect(screen.getByText('Achieved')).toBeDefined();
  });
});
