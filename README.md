# Interview Feedback Platform

A platform for grading and viewing feedback from 1:1 mock interview sessions. 

**Supported Functionality**
* Admin can fill out interview feedback based on interview type and rubric and it's emailed to a candidate
* Candidate can view their specific feedback via the emailed URL and if they sign up, they're able to view all historical feedback 

## How to Run the App

### 1. Install Dependencies
```bash
yarn install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase credentials:
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173

# Optional: Resend API Key for live email dispatch (simulated in dev if omitted)
RESEND_API_KEY=re_your_api_key
```

### 3. Initialize the Database
1. Run migrations using Supabase CLI (`yarn db:push` or `supabase db push`), or copy and run the baseline schema in your [Supabase Dashboard](https://supabase.com) > **SQL Editor** from [`supabase/migrations/20261113000000_initial_schema.sql`](supabase/migrations/20261113000000_initial_schema.sql). This sets up tables, RLS policies, triggers, and calibrated rubric criteria.
2. Sign in once at `/login` with your email, then run this in the Supabase SQL Editor to grant admin access:
```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

### 4. Start Development Server
```bash
yarn dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Local Supabase Clone & Preview (Recommended)
To test migrations or features locally against a private snapshot of production:
```bash
# 1. Pulls latest production data snapshot and spins up local Supabase
npm run db:clone

# 2. Start the frontend (automatically points to your local clone)
npm run dev

# 3. Open Supabase Studio in your browser to inspect tables and data
# http://127.0.0.1:54323
```
To stop the local containers when finished:
```bash
npm run db:stop
rm .env.local
```

### Other Commands
- **Unit & Integration Tests**: `yarn test` (or `yarn test:watch`)
- **Supabase Integration Tests**: `yarn test:supabase`
- **Type Check**: `yarn typecheck`
- **Full Verification**: `yarn verify` (Typecheck + Tests + Build)
- **Production Build**: `yarn build`
- **Preview Build**: `yarn preview`
