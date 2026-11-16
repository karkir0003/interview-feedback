export interface FormattedAuthError {
  title: string;
  message: string;
}

/**
 * Translates Supabase/GoTrue auth error codes and raw descriptions
 * into human-friendly, actionable titles and messages.
 */
export function formatAuthError(code: string, rawMessage: string): FormattedAuthError {
  const desc = decodeURIComponent(rawMessage.replace(/\+/g, ' ')).toLowerCase();
  const c = code.toLowerCase();

  if (c === 'otp_expired' || desc.includes('expired') || desc.includes('invalid or has expired')) {
    return {
      title: 'Sign-in Link Expired',
      message: 'This magic link has expired or has already been used. Please enter your email below to receive a fresh sign-in link.',
    };
  }

  if (
    c === 'over_email_send_rate_limit' ||
    c === 'over_request_rate_limit' ||
    desc.includes('rate limit') ||
    desc.includes('rate_limit') ||
    desc.includes('rate limit exceeded')
  ) {
    return {
      title: 'Too Many Requests',
      message: 'Too many sign-in emails were requested in a short window. Please wait a moment before trying again.',
    };
  }

  if (c === 'access_denied') {
    return {
      title: 'Access Denied',
      message: 'Sign-in was canceled or denied. Please try again.',
    };
  }

  return {
    title: 'Authentication Error',
    message: rawMessage || 'Unable to authenticate with this link. Please request a new sign-in link.',
  };
}
