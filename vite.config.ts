/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'local-api-send-report',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/send-report' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', (chunk) => {
                bodyStr += chunk;
              });
              req.on('end', async () => {
                try {
                  const data = JSON.parse(bodyStr || '{}');
                  const { evaluationId, candidateEmail, candidateName, interviewTypeName, questionTitle, publicToken } = data;

                  const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
                  const appUrl = env.VITE_APP_URL || env.APP_URL || 'http://localhost:5173';
                  const reportUrl = `${appUrl}/r/${publicToken}`;

                  console.log(`[Dev API /api/send-report] Sending mock report email to: ${candidateEmail}`);
                  console.log(`[Dev API /api/send-report] Public Report URL: ${reportUrl}`);

                  if (resendApiKey) {
                    const emailResponse = await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        from: env.RESEND_FROM_EMAIL || 'Interview Feedback <onboarding@resend.dev>',
                        to: [candidateEmail],
                        subject: `Your Mock Interview Feedback: ${interviewTypeName} — ${questionTitle}`,
                        html: `
                          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
                            <h2 style="color: #0f172a; margin-bottom: 8px;">Hi ${candidateName},</h2>
                            <p style="font-size: 16px; line-height: 1.5; color: #475569;">
                              Your mock interview evaluation for <strong>${interviewTypeName}</strong> (${questionTitle}) is ready for review.
                            </p>
                            <div style="margin: 32px 0;">
                              <a href="${reportUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                                View Mock Interview Scorecard
                              </a>
                            </div>
                            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
                              You can access this link directly without an account. If you've completed multiple sessions, sign in with <strong>${candidateEmail}</strong> to view your full longitudinal score progression.
                            </p>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                            <p style="font-size: 12px; color: #94a3b8;">
                              Evaluation ID: ${evaluationId}
                            </p>
                          </div>
                        `,
                      }),
                    });

                    if (!emailResponse.ok) {
                      const errData = await emailResponse.text();
                      console.warn('[Dev API] Resend API responded with error:', errData);
                    }
                  } else {
                    console.log('[Dev API] No RESEND_API_KEY detected in dev environment; email simulated successfully.');
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, simulated: !resendApiKey }));
                } catch (err: unknown) {
                  const error = err as Error;
                  res.setHeader('Content-Type', 'application/json');
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: error.message || 'Failed to send email' }));
                }
              });
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-markdown': ['react-markdown', 'remark-gfm'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
