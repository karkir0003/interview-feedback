import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import * as AuthModule from '../contexts/AuthContext';
import { ToastProvider } from '../components/common/Toast';

describe('LoginPage Authentication & Error Recovery', () => {
  const mockSignInWithMagicLink = vi.fn();
  const mockSignInWithGoogle = vi.fn();
  const mockSignInWithPassword = vi.fn();

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
      signInWithPassword: mockSignInWithPassword,
      signInWithMagicLink: mockSignInWithMagicLink,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('renders expired magic link banner when URL has otp_expired error parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/login#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired']}>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Sign-in Link Expired')).toBeDefined();
    expect(
      within(alert).getByText(
        'This magic link has expired or has already been used. Please enter your email below to receive a fresh sign-in link.'
      )
    ).toBeDefined();
  });

  it('renders friendly banner when URL has over_email_send_rate_limit error', async () => {
    render(
      <MemoryRouter initialEntries={['/login?error_code=over_email_send_rate_limit&error_description=email+signup+rate+limit+exceeded']}>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Too Many Requests')).toBeDefined();
    expect(
      within(alert).getByText(
        'Too many sign-in emails were requested in a short window. Please wait a moment before trying again.'
      )
    ).toBeDefined();
  });

  it('triggers cooldown countdown and check inbox view after dispatching magic link', async () => {
    mockSignInWithMagicLink.mockResolvedValueOnce({ error: null });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('candidate@example.com');
    const submitBtn = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'candidate@test.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithMagicLink).toHaveBeenCalledWith(
        'candidate@test.com',
        'http://localhost:3000/login'
      );
    });

    expect(await screen.findByText('Check your inbox')).toBeDefined();
    expect(screen.getByText('candidate@test.com')).toBeDefined();
    expect(screen.getByText(/resend link in \d+s/i)).toBeDefined();
  });

  it('displays error banner if signInWithMagicLink returns rate-limited AuthApiError', async () => {
    mockSignInWithMagicLink.mockResolvedValueOnce({
      error: new Error('email signup rate limit exceeded'),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('candidate@example.com');
    const submitBtn = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'rate.limit@test.com' } });
    fireEvent.click(submitBtn);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Too Many Requests')).toBeDefined();
  });

  it('automatically redirects logged in candidates to /history', async () => {
    vi.spyOn(AuthModule, 'useAuth').mockReturnValue({
      user: { id: 'u1', email: 'candidate@test.com' } as any,
      session: {} as any,
      profile: { id: 'u1', email: 'candidate@test.com', role: 'candidate', created_at: '' },
      role: 'candidate',
      isAdmin: false,
      isInterviewer: false,
      canGrade: false,
      isLoading: false,
      isConfigured: true,
      signInWithPassword: mockSignInWithPassword,
      signInWithMagicLink: mockSignInWithMagicLink,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/history" element={<div>Candidate History Route</div>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Candidate History Route')).toBeDefined();
  });
});
