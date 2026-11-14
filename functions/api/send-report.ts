interface Env {
  VITE_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  APP_URL?: string;
  VITE_APP_URL?: string;
}

interface SendReportPayload {
  evaluationId: string;
  candidateEmail: string;
  candidateName: string;
  interviewTypeName: string;
  questionTitle: string;
  publicToken: string;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  // 1. Verify Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: missing Supabase credentials' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Verify user and role via Supabase Auth
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
      },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid Supabase token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await userRes.json() as { id: string; email?: string };

    // Verify user role if profile exists
    try {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey,
          },
        }
      );

      if (profileRes.ok) {
        const profiles = (await profileRes.json()) as Array<{ role: string }>;
        if (profiles && profiles.length > 0 && !['admin', 'interviewer', 'candidate'].includes(profiles[0].role)) {
          return new Response(JSON.stringify({ error: 'Forbidden: caller is not authorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } catch {
      // Non-fatal: if profile lookup times out, allow authenticated user to proceed
    }

    // 3. Parse and validate body
    const body = (await request.json()) as Partial<SendReportPayload>;
    const { candidateEmail, candidateName, interviewTypeName, questionTitle, publicToken } = body;

    if (!candidateEmail || !publicToken || !candidateName) {
      return new Response(JSON.stringify({ error: 'Missing required payload parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const origin = new URL(request.url).origin;
    const reportUrl = `${origin}/r/${publicToken}`;
    const resendApiKey = env.RESEND_API_KEY;

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          simulated: true,
          message: 'RESEND_API_KEY not configured; email simulation logged',
          reportUrl,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Send email via Resend API
    const fromAddress = 'MockSignal <onboarding@resend.dev>';
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [candidateEmail],
        subject: `Your Mock Interview Feedback: ${interviewTypeName} — ${questionTitle}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff;">
            <div style="margin-bottom: 24px;">
              <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">
                ${interviewTypeName}
              </span>
            </div>
            <h1 style="color: #0f172a; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 700;">
              Hi ${candidateName},
            </h1>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
              Your mock interview evaluation for <strong>${questionTitle}</strong> has been finalized and is ready for review.
            </p>
            <div style="margin: 28px 0;">
              <a href="${reportUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                View Your Scorecard & Feedback →
              </a>
            </div>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin: 24px 0;">
              <p style="font-size: 13px; color: #78350f; margin: 0; line-height: 1.5;">
                💸 <strong>Enjoyed the session?</strong> Feel free to leave a <a href="https://buy.stripe.com/00g4k40b0gLOcV25kk" style="color: #b45309; font-weight: 700; text-decoration: underline;">tip on Stripe</a> — it helps support the time and care I put into each 1:1.
              </p>
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">
                💡 <strong>Track your progression:</strong> You can view this report anytime without logging in. If you complete multiple mock interviews, sign in at the platform using <strong>${candidateEmail}</strong> to view your longitudinal progression and historical rubrics.
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5; word-break: break-all;">
              Direct link: <a href="${reportUrl}" style="color: #64748b; text-decoration: underline;">${reportUrl}</a>
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(JSON.stringify({ error: `Resend API error: ${errText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailJson = await emailRes.json();
    return new Response(JSON.stringify({ success: true, resend: emailJson }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

