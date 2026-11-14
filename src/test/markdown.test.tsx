import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackMarkdown } from '../components/common/FeedbackMarkdown';

describe('FeedbackMarkdown Component', () => {
  it('renders rich markdown content with bold and lists', () => {
    const markdown = `
### Strengths
- **Algorithmic efficiency**: Clean hash map approach.
- Proactive communication throughout.
    `.trim();

    render(<FeedbackMarkdown content={markdown} />);
    expect(screen.getByText('Strengths')).toBeDefined();
    expect(screen.getByText('Algorithmic efficiency')).toBeDefined();
    expect(screen.getByText(/Clean hash map approach/)).toBeDefined();
  });

  it('renders placeholder when content is empty or whitespace', () => {
    render(
      <FeedbackMarkdown
        content="   "
        placeholder="No evaluation feedback provided yet."
      />
    );
    expect(screen.getByText('No evaluation feedback provided yet.')).toBeDefined();
  });
});
