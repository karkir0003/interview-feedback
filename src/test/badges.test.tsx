import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HireabilityBadge, ScoreBadge, ScoreProgressBar } from '../components/common/Badges';

describe('Badges & UI Display Components', () => {
  describe('HireabilityBadge', () => {
    it('renders "Strong Hire" with correct styling and text', () => {
      render(<HireabilityBadge verdict="Strong Hire" />);
      expect(screen.getByText('Strong Hire')).toBeDefined();
    });

    it('renders "Hire" verdict', () => {
      render(<HireabilityBadge verdict="Hire" />);
      expect(screen.getByText('Hire')).toBeDefined();
    });

    it('renders "Partial Hire" verdict', () => {
      render(<HireabilityBadge verdict="Partial Hire" />);
      expect(screen.getByText('Partial Hire')).toBeDefined();
    });

    it('renders "No Hire" verdict', () => {
      render(<HireabilityBadge verdict="No Hire" />);
      expect(screen.getByText('No Hire')).toBeDefined();
    });
  });

  describe('ScoreBadge', () => {
    it('renders 5 as 5 / 5 with emerald background', () => {
      const { container } = render(<ScoreBadge score={5} />);
      expect(screen.getByText(/5\s*\/\s*5/)).toBeDefined();
      expect(container.firstChild).toHaveProperty('className');
      expect((container.firstChild as HTMLElement).className).toContain('bg-emerald-600');
    });

    it('renders 4 as 4 / 5 with teal background', () => {
      const { container } = render(<ScoreBadge score={4} />);
      expect(screen.getByText(/4\s*\/\s*5/)).toBeDefined();
      expect((container.firstChild as HTMLElement).className).toContain('bg-teal-600');
    });

    it('renders 3 as 3 / 5 with blue background', () => {
      const { container } = render(<ScoreBadge score={3} />);
      expect(screen.getByText(/3\s*\/\s*5/)).toBeDefined();
      expect((container.firstChild as HTMLElement).className).toContain('bg-blue-600');
    });

    it('renders 2 as 2 / 5 with amber background', () => {
      const { container } = render(<ScoreBadge score={2} />);
      expect(screen.getByText(/2\s*\/\s*5/)).toBeDefined();
      expect((container.firstChild as HTMLElement).className).toContain('bg-amber-500');
    });

    it('renders 1 as 1 / 5 with rose background', () => {
      const { container } = render(<ScoreBadge score={1} />);
      expect(screen.getByText(/1\s*\/\s*5/)).toBeDefined();
      expect((container.firstChild as HTMLElement).className).toContain('bg-rose-600');
    });
  });

  describe('ScoreProgressBar', () => {
    it('calculates width based on score out of 5', () => {
      const { container } = render(<ScoreProgressBar score={4} />);
      const fillBar = container.querySelector('.bg-teal-500');
      expect(fillBar).toBeDefined();
      expect((fillBar as HTMLElement).style.width).toBe('80%');
    });

    it('caps progress at 100% for score 5', () => {
      const { container } = render(<ScoreProgressBar score={5} />);
      const fillBar = container.querySelector('.bg-emerald-500');
      expect(fillBar).toBeDefined();
      expect((fillBar as HTMLElement).style.width).toBe('100%');
    });
  });
});
