import { onRequestPost } from '../functions/api/send-report';

interface WorkerEnv {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
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
  STRIPE_TIP_URL?: string;
  VITE_STRIPE_TIP_URL?: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // API Routes
    if (url.pathname === '/api/send-report' && request.method === 'POST') {
      return onRequestPost({ request, env });
    }

    // Serve static assets with single-page-application fallback (to dist/index.html)
    return env.ASSETS.fetch(request);
  },
};

