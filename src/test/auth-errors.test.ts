import { describe, it, expect } from 'vitest';
import { formatAuthError } from '../lib/auth-errors';

describe('formatAuthError utility', () => {
  it('identifies expired OTP tokens from error code', () => {
    const error = formatAuthError('otp_expired', 'Email link is invalid or has expired');
    expect(error.title).toBe('Sign-in Link Expired');
    expect(error.message).toContain('This magic link has expired or has already been used');
  });

  it('identifies expired tokens from raw message keywords even if code is generic', () => {
    const error = formatAuthError('access_denied', 'Token has expired or was already consumed');
    expect(error.title).toBe('Sign-in Link Expired');
  });

  it('translates rate limit error codes into friendly user messages', () => {
    const error = formatAuthError('over_email_send_rate_limit', 'email signup rate limit exceeded');
    expect(error.title).toBe('Too Many Requests');
    expect(error.message).toContain('Too many sign-in emails were requested in a short window');
  });

  it('translates generic access_denied code', () => {
    const error = formatAuthError('access_denied', 'User denied');
    expect(error.title).toBe('Access Denied');
    expect(error.message).toContain('Sign-in was canceled or denied');
  });

  it('falls back gracefully on unknown auth errors', () => {
    const error = formatAuthError('unknown_code', 'Database error connecting to user store');
    expect(error.title).toBe('Authentication Error');
    expect(error.message).toBe('Database error connecting to user store');
  });
});

