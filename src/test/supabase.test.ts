import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Supabase Client & Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('detects unconfigured / placeholder environment variables', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-anon-key');

    const { isSupabaseConfigured } = await import('../lib/supabase');
    expect(isSupabaseConfigured).toBe(false);
  });

  it('detects valid configured environment variables', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://xyzcompany.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy');

    const { isSupabaseConfigured } = await import('../lib/supabase');
    expect(isSupabaseConfigured).toBe(true);
  });

  it('initializes the supabase client with auth session options', async () => {
    const { supabase } = await import('../lib/supabase');
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});

