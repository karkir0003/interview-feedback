import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ToastProvider } from '../components/common/Toast';
import * as AuthModule from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const mockInterviewTypes = [
  { id: 'type-1', slug: 'dsa', name: 'DSA / LeetCode', display_order: 1, is_active: true },
];

const mockCriteria = [
  {
    id: 'crit-1',
    interview_type_id: 'type-1',
    criterion_key: 'optimality',
    label: 'Optimality of solution',
    display_order: 1,
    is_active: true,
    scale_descriptions: {
      '1': 'Level 1 Very Poor',
      '2': 'Level 2 Below Bar',
      '3': 'Level 3 Meets Bar',
      '4': 'Level 4 Strong',
      '5': 'Level 5 Exceptional',
    },
  },
  {
    id: 'crit-2',
    interview_type_id: 'type-1',
    criterion_key: 'communication',
    label: 'Clear Communication',
    display_order: 2,
    is_active: true,
    scale_descriptions: {
      '1': 'Comm 1',
      '2': 'Comm 2',
      '3': 'Comm 3',
      '4': 'Comm 4',
      '5': 'Comm 5',
    },
  },
];

const mockQuestions = [
  { id: 'q-1', interview_type_id: 'type-1', title: 'LRU Cache', is_active: true },
];

describe('Grade Interview Page: Defaults & Required Field Validations', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      user: { id: 'admin-1', email: 'admin@example.com' } as any,
      session: { access_token: 'fake-jwt' } as any,
      profile: { id: 'admin-1', email: 'admin@example.com', role: 'admin', created_at: '' },
      role: 'admin',
      isAdmin: true,
      isInterviewer: false,
      canGrade: true,
      isLoading: false,
      isConfigured: true,
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'interview_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockInterviewTypes, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'rubric_criteria') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockCriteria, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'questions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockQuestions, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'evaluations') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any;
    });
  });

  it('initializes with NO defaults selected for track, rubric scores, questions, or verdict', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminDashboardPage />
        </ToastProvider>
      </MemoryRouter>
    );

    // Wait for reference data to finish loading
    await waitFor(() => {
      expect(screen.queryByText('Loading interview rubrics and questions...')).toBeNull();
    });

    // 1. Verify Track has NO default selected
    expect(screen.getByText('No Interview Track Selected')).toBeDefined();

    // 2. Select track actively
    fireEvent.click(screen.getByText('DSA / LeetCode'));

    // 3. Verify Track is now selected
    expect(screen.getByText('Track Selected ✓')).toBeDefined();

    // 4. Verify Overall Hireability Verdict has NO default selected
    expect(screen.getByText('Selection Required *')).toBeDefined();

    // 5. Verify Rubric criteria show "Score Required *" (unscored by default)
    const requiredBadges = screen.getAllByText('Score Required *');
    expect(requiredBadges.length).toBe(2);

    // 6. Verify Rubric header counter shows 0/2 Scored
    expect(screen.getByText('0/2 Scored (Required)')).toBeDefined();

    // 7. Verify Question combobox has placeholder selected by default
    const selectEl = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectEl.value).toBe('');
  });

  it('updates progress indicator and removes required badge when an interviewer scores a criterion', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminDashboardPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading interview rubrics and questions...')).toBeNull();
    });

    // Select track first
    fireEvent.click(screen.getByText('DSA / LeetCode'));

    // Wait for criteria to populate
    await waitFor(() => {
      expect(screen.getByText('0/2 Scored (Required)')).toBeDefined();
    });

    // Click Level 4 (Strong) on the first criterion ("Optimality of solution")
    const level4Buttons = screen.getAllByText(/4 • Strong/);
    fireEvent.click(level4Buttons[0]);

    // Counter updates from 0/2 to 1/2 Scored
    expect(screen.getByText('1/2 Scored (Required)')).toBeDefined();

    // The first criterion now shows Selected: 4/5 • Strong
    expect(screen.getByText('Selected: 4/5')).toBeDefined();

    // Click Level 3 (Meets Bar) on the second criterion
    const level3Buttons = screen.getAllByText(/3 • Meets Bar/);
    fireEvent.click(level3Buttons[1]);

    // All criteria now scored! Header displays green completion badge
    expect(screen.getByText('All 2 Scored ✓')).toBeDefined();
  });

  it('updates overall verdict indicator when interviewer selects a verdict', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminDashboardPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading interview rubrics and questions...')).toBeNull();
    });

    // Select track
    fireEvent.click(screen.getByText('DSA / LeetCode'));

    expect(screen.getByText('Selection Required *')).toBeDefined();

    // Click 'Strong Hire' verdict
    fireEvent.click(screen.getByText('Strong Hire'));

    // Required badge turns into green 'Verdict Selected ✓'
    expect(screen.getByText('Verdict Selected ✓')).toBeDefined();
  });

  it('purges any stale drafts from localStorage on mount and starts completely unselected', async () => {
    // Simulate pre-existing stale drafts in localStorage
    localStorage.setItem('mock_rubric_admin_draft_v1', JSON.stringify({ selectedTypeId: 'type-1' }));
    localStorage.setItem('mock_rubric_admin_draft_v2', JSON.stringify({ selectedTypeId: 'type-1' }));
    localStorage.setItem('mock_rubric_admin_draft_v3', JSON.stringify({ selectedTypeId: 'type-1', hireability: 'Hire' }));

    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminDashboardPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading interview rubrics and questions...')).toBeNull();
    });

    // Stale drafts should be wiped
    expect(localStorage.getItem('mock_rubric_admin_draft_v1')).toBeNull();
    expect(localStorage.getItem('mock_rubric_admin_draft_v2')).toBeNull();
    expect(localStorage.getItem('mock_rubric_admin_draft_v3')).toBeNull();

    // Verify track is NOT selected
    expect(screen.getByText('No Interview Track Selected')).toBeDefined();
    // Verify both Track and Verdict show "Selection Required *"
    const requiredBadges = screen.getAllByText('Selection Required *');
    expect(requiredBadges.length).toBe(2);
  });

  it('resets form fields when Reset Form button is clicked', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminDashboardPage />
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading interview rubrics and questions...')).toBeNull();
    });

    // Select track and verdict
    fireEvent.click(screen.getByText('DSA / LeetCode'));
    fireEvent.click(screen.getByText('Hire'));

    expect(screen.getByText('Track Selected ✓')).toBeDefined();
    expect(screen.getByText('Verdict Selected ✓')).toBeDefined();

    // Click Reset Form
    fireEvent.click(screen.getByText('Reset Form'));

    // Returns to unselected state: track callout is visible and both badges show Selection Required *
    expect(screen.getByText('No Interview Track Selected')).toBeDefined();
    const requiredBadges = screen.getAllByText('Selection Required *');
    expect(requiredBadges.length).toBe(2);
  });
});
