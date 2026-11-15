import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevQuickLogin } from '../components/auth/DevQuickLogin';

describe('DevQuickLogin Component', () => {
  it('renders all three synthetic dev accounts', () => {
    const handleLogin = vi.fn();
    render(<DevQuickLogin onLogin={handleLogin} />);

    expect(screen.getByText('Local Dev Quick-Login')).toBeDefined();
    expect(screen.getByText('Admin')).toBeDefined();
    expect(screen.getByText('admin@mocksignal.local')).toBeDefined();
    expect(screen.getByText('Interviewer')).toBeDefined();
    expect(screen.getByText('interviewer@mocksignal.local')).toBeDefined();
    expect(screen.getByText('Candidate')).toBeDefined();
    expect(screen.getByText('candidate@mocksignal.local')).toBeDefined();
  });

  it('triggers onLogin with the clicked account email', () => {
    const handleLogin = vi.fn();
    render(<DevQuickLogin onLogin={handleLogin} />);

    fireEvent.click(screen.getByText('Admin'));
    expect(handleLogin).toHaveBeenCalledWith('admin@mocksignal.local');

    fireEvent.click(screen.getByText('Interviewer'));
    expect(handleLogin).toHaveBeenCalledWith('interviewer@mocksignal.local');

    fireEvent.click(screen.getByText('Candidate'));
    expect(handleLogin).toHaveBeenCalledWith('candidate@mocksignal.local');
  });

  it('disables buttons when isSubmitting is true', () => {
    const handleLogin = vi.fn();
    render(<DevQuickLogin onLogin={handleLogin} isSubmitting={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveProperty('disabled', true);
    });
  });
});
